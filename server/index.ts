import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseHealth } from "./db";

// Extend Express Request type to include rawBody
declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Initialize Express application
const app = express();

// ============ SECURITY MIDDLEWARE ============

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for development
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for development
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://docs.google.com"], // Allow Google Docs/Slides embedding
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development
}));

// CORS configuration for local development
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // More lenient in development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// More strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful logins
});
app.use('/api/auth/', authLimiter);

// ============ PERFORMANCE MIDDLEWARE ============

// Response compression
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses larger than 1KB
}));

// ============ BODY PARSING MIDDLEWARE ============

// JSON body parsing with raw body preservation
app.use(express.json({
  limit: '10mb', // Increase limit for file uploads
  verify: (req, _res, buf) => {
    req.rawBody = buf; // Store raw body for signature verification if needed
  }
}));

// URL-encoded form data parsing
app.use(express.urlencoded({ 
  extended: true, // Allow nested objects
  limit: '10mb',
  parameterLimit: 1000, // Increase parameter limit
}));

// ============ REQUEST LOGGING MIDDLEWARE ============

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture JSON responses for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log request completion
  res.on("finish", () => {
    const duration = Date.now() - start;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    
    // Log API requests with details
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Add response data for non-2xx status codes or development
      if (capturedJsonResponse && (res.statusCode >= 400 || process.env.NODE_ENV === 'development')) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        if (responseStr.length < 200) {
          logLine += ` :: ${responseStr}`;
        } else {
          logLine += ` :: ${responseStr.substring(0, 197)}...`;
        }
      }
      
      // Add client information in development
      if (process.env.NODE_ENV === 'development') {
        logLine += ` [IP: ${ip}, UA: ${userAgent.substring(0, 30)}...]`;
      }

      // Truncate very long log lines
      if (logLine.length > 200) {
        logLine = logLine.slice(0, 197) + "...";
      }

      log(logLine);
    }
    
    // Log slow requests
    if (duration > 1000) {
      log(`Slow request: ${req.method} ${path} took ${duration}ms`);
    }
  });

  next();
});

// ============ HEALTH CHECK ENDPOINT ============

app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbHealth,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    };
    
    res.status(200).json(healthStatus);
  } catch (error) {
    const healthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
    };
    
    res.status(503).json(healthStatus);
  }
});

// ============ ROOT ENDPOINT ============

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Secure Coding Lab API Server',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api/docs',
    }
  });
});

// ============ APPLICATION STARTUP ============

(async () => {
  try {
    log('Starting Secure Coding Lab API Server...');
    log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`Database URL: ${process.env.DATABASE_URL ? 'Configured' : 'Missing'}`);
    
    // Register all application routes
    log('Registering routes...');
    const server = await registerRoutes(app);
    
    // Setup Vite in development or serve static files in production
    if (app.get("env") === "development") {
      log('Setting up Vite dev server...');
      await setupVite(app, server);
    } else {
      log('Serving static files...');
      serveStatic(app);
    }

    // Get port from environment or default to 5000
    const port = parseInt(process.env.PORT || '5000', 10);
    
    // Validate port number
    if (port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}. Must be between 1 and 65535.`);
    }

    // Start the server
    server.listen({
      port,
      host: "0.0.0.0", // Listen on all interfaces
      reusePort: true,
    }, () => {
      log(`Server successfully started on port ${port}`);
      log(`Access the application at: http://localhost:${port}`);
      log(`Health check available at: http://localhost:${port}/health`);
      log(`API endpoints available at: http://localhost:${port}/api`);
      
      if (process.env.NODE_ENV === 'development') {
        log('Development mode: Hot reloading enabled');
      }
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      log(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Close the server
        server.close((err) => {
          if (err) {
            console.error('Error closing server:', err);
            process.exit(1);
          }
          
          log('HTTP server closed');
          process.exit(0);
        });
        
        // Force exit after 10 seconds if graceful shutdown fails
        setTimeout(() => {
          console.error('Forced shutdown after timeout');
          process.exit(1);
        }, 10000);
        
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Register signal handlers for graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Export app for testing purposes
export default app;
