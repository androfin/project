import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger, type ViteDevServer } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server): Promise<ViteDevServer> {
  try {
    log("Setting up Vite development server...", "vite");

    const serverOptions = {
      middlewareMode: true,
      hmr: { 
        server,
        protocol: 'ws',
        host: 'localhost',
        port: 24678
      },
      allowedHosts: true as const,
    };

    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        info: (msg, options) => {
          if (msg.includes('hmr update') || msg.includes('hot updated')) {
            // Skip frequent HMR update logs in development
            return;
          }
          viteLogger.info(msg, options);
        },
        warn: (msg, options) => {
          viteLogger.warn(msg, options);
        },
        error: (msg, options) => {
          viteLogger.error(msg, options);
          // Don't exit process on error in development
          // process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    // Use Vite's connect instance as middleware
    app.use(vite.middlewares);

    // Serve Vite-processed HTML for all routes
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        // Skip API routes and static files
        if (url.startsWith("/api") || url.startsWith("/objects") || url.includes(".")) {
          return next();
        }

        const clientTemplate = path.resolve(
          import.meta.dirname,
          "..",
          "client",
          "index.html",
        );

        // Check if template file exists
        if (!fs.existsSync(clientTemplate)) {
          log(`Client template not found at: ${clientTemplate}`, "vite");
          return res.status(404).send("Client template not found. Please check your build configuration.");
        }

        // Always reload the index.html file from disk in case it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        
        // Add cache-busting query parameter for development
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );

        // Transform index.html with Vite
        const page = await vite.transformIndexHtml(url, template);
        
        res.status(200).set({ 
          "Content-Type": "text/html",
          "X-Dev-Server": "vite"
        }).end(page);

        log(`Served Vite-processed page for: ${url}`, "vite");

      } catch (error) {
        // Fix stack traces for Vite errors
        if (vite && typeof vite.ssrFixStacktrace === 'function') {
          vite.ssrFixStacktrace(error as Error);
        }
        
        log(`Error serving Vite page for ${url}: ${error}`, "vite");
        next(error);
      }
    });

    log("Vite development server setup completed successfully", "vite");
    return vite;

  } catch (error) {
    log(`Failed to setup Vite development server: ${error}`, "vite");
    throw error;
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist");
  const publicPath = path.resolve(import.meta.dirname, "..", "public");

  // Check for dist directory first (Vite build output)
  if (fs.existsSync(distPath)) {
    log(`Serving static files from dist directory: ${distPath}`, "static");
    app.use(express.static(distPath, {
      index: false, // Don't serve index.html for directories
      maxAge: "1y", // Long cache for static assets
      etag: true,
      lastModified: true,
    }));

    // Fall through to index.html for SPA routing
    app.use("*", (req, res, next) => {
      // Skip API routes
      if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/objects")) {
        return next();
      }

      const indexPath = path.resolve(distPath, "index.html");
      
      if (!fs.existsSync(indexPath)) {
        log(`Index.html not found in dist directory: ${indexPath}`, "static");
        return res.status(404).send(`
          <html>
            <head><title>404 - Not Found</title></head>
            <body>
              <h1>404 - Page Not Found</h1>
              <p>The application has not been built yet.</p>
              <p>Please run: <code>npm run build</code></p>
            </body>
          </html>
        `);
      }

      res.sendFile(indexPath, (err) => {
        if (err) {
          log(`Error sending index.html: ${err}`, "static");
          next(err);
        }
      });
    });

  } 
  // Fallback to public directory if dist doesn't exist
  else if (fs.existsSync(publicPath)) {
    log(`Serving static files from public directory: ${publicPath}`, "static");
    app.use(express.static(publicPath));

    app.use("*", (req, res) => {
      // Skip API routes
      if (req.originalUrl.startsWith("/api") || req.originalUrl.startsWith("/objects")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }

      const indexPath = path.resolve(publicPath, "index.html");
      
      if (!fs.existsSync(indexPath)) {
        return res.status(404).send(`
          <html>
            <head><title>404 - Not Found</title></head>
            <body>
              <h1>404 - Page Not Found</h1>
              <p>Neither dist nor public directory contains a valid build.</p>
              <p>Please run: <code>npm run build</code></p>
            </body>
          </html>
        `);
      }

      res.sendFile(indexPath);
    });
  } 
  else {
    throw new Error(
      `Could not find the build directory. Expected either:\n` +
      `- ${distPath} (Vite build output)\n` +
      `- ${publicPath} (static public files)\n\n` +
      `Make sure to build the client first with: npm run build`
    );
  }
}

// Utility function to check if we're in development mode
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

// Utility function to get the correct static file path
export function getStaticPath(): string {
  const distPath = path.resolve(import.meta.dirname, "..", "dist");
  const publicPath = path.resolve(import.meta.dirname, "..", "public");
  
  if (fs.existsSync(distPath)) {
    return distPath;
  }
  if (fs.existsSync(publicPath)) {
    return publicPath;
  }
  throw new Error("No static files directory found");
}

// Health check for Vite dev server (development only)
export function setupViteHealthCheck(app: Express, vite: ViteDevServer) {
  if (!isDevelopment()) return;

  app.get('/_vite/health', (req, res) => {
    res.json({
      status: 'healthy',
      server: 'vite',
      timestamp: new Date().toISOString(),
      urls: vite.resolvedUrls
    });
  });
}

export default {
  setupVite,
  serveStatic,
  log,
  isDevelopment,
  getStaticPath,
  setupViteHealthCheck
};
