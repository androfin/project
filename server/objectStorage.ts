import { Response } from "express";
import { randomUUID } from "crypto";
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Use the correct type for multer file
type MulterFile = Express.Multer.File;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadsDir();
  }

  private ensureUploadsDir() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "uploads";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Please set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "uploads";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Please set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<string | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = path.join(process.cwd(), searchPath, filePath);
      
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  async downloadObject(filePath: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new ObjectNotFoundError();
      }

      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Set appropriate content type based on file extension
      let contentType = 'application/octet-stream';
      if (ext === '.pptx') {
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      } else if (ext === '.ppt') {
        contentType = 'application/vnd.ms-powerpoint';
      } else if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      } else if (ext === '.gif') {
        contentType = 'image/gif';
      }

      res.set({
        "Content-Type": contentType,
        "Content-Length": stats.size.toString(),
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      const stream = fs.createReadStream(filePath);

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        if (error instanceof ObjectNotFoundError) {
          res.status(404).json({ error: "File not found" });
        } else {
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    // For local file storage, we handle uploads via multer middleware
    // This method is kept for API compatibility but throws an error
    throw new Error(
      "Local file storage - use direct file upload endpoint instead of signed URLs"
    );
  }

  async getObjectEntityFile(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const entityId = objectPath.slice("/objects/".length);
    const filePath = path.join(this.uploadsDir, entityId);
    
    if (!fs.existsSync(filePath)) {
      throw new ObjectNotFoundError();
    }
    
    return filePath;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // For local storage, convert any path to the /objects/ format
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }

    // If it's a full path, extract just the filename
    if (rawPath.includes(this.uploadsDir)) {
      const relativePath = path.relative(this.uploadsDir, rawPath);
      return `/objects/${relativePath}`;
    }

    // If it's just a filename, assume it's in uploads
    return `/objects/${path.basename(rawPath)}`;
  }

  // New method for saving uploaded files locally
  async saveFile(file: MulterFile): Promise<string> {
    const fileId = randomUUID();
    const fileExt = path.extname(file.originalname);
    const fileName = `${fileId}${fileExt}`;
    const filePath = path.join(this.uploadsDir, fileName);

    // Ensure directory exists
    this.ensureUploadsDir();

    // Move the file from temp location to uploads directory
    try {
      await fs.promises.rename(file.path, filePath);
      return `/objects/${fileName}`;
    } catch (error) {
      console.error("Error saving file:", error);
      throw new Error("Failed to save file");
    }
  }

  // New method for deleting files
  async deleteFile(objectPath: string): Promise<void> {
    try {
      const filePath = await this.getObjectEntityFile(objectPath);
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        console.log("File not found for deletion:", objectPath);
      } else {
        console.error("Error deleting file:", error);
        throw new Error("Failed to delete file");
      }
    }
  }

  // New method for listing files in uploads directory
  async listFiles(): Promise<string[]> {
    try {
      this.ensureUploadsDir();
      const files = await fs.promises.readdir(this.uploadsDir);
      return files.map(file => `/objects/${file}`);
    } catch (error) {
      console.error("Error listing files:", error);
      return [];
    }
  }

  // New method for getting file information
  async getFileInfo(objectPath: string): Promise<{
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    contentType: string;
  } | null> {
    try {
      const filePath = await this.getObjectEntityFile(objectPath);
      const stats = await fs.promises.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      let contentType = 'application/octet-stream';
      if (ext === '.pptx') {
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      } else if (ext === '.ppt') {
        contentType = 'application/vnd.ms-powerpoint';
      } else if (ext === '.pdf') {
        contentType = 'application/pdf';
      }

      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        contentType
      };
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return null;
      }
      console.error("Error getting file info:", error);
      throw error;
    }
  }

  // Helper method to configure multer for file uploads
  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        this.ensureUploadsDir();
        cb(null, this.uploadsDir);
      },
      filename: (req, file, cb) => {
        const fileId = randomUUID();
        const fileExt = path.extname(file.originalname);
        const fileName = `${fileId}${fileExt}`;
        cb(null, fileName);
      }
    });

    return multer({
      storage: storage,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
      fileFilter: (req, file, cb) => {
        // Allow specific file types
        const allowedTypes = [
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif'
        ];
        
        const allowedExt = ['.ppt', '.pptx', '.pdf', '.jpg', '.jpeg', '.png', '.gif'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(file.mimetype) || allowedExt.includes(fileExt)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only presentations, PDFs, and images are allowed.'));
        }
      }
    });
  }
}

// Helper function to parse object paths (kept for compatibility)
function parseObjectPath(filePath: string): {
  bucketName: string;
  objectName: string;
} {
  // For local storage, we simulate bucket structure
  // "bucket" is always "local" and objectName is the file path
  const relativePath = path.relative(process.cwd(), filePath);
  
  return {
    bucketName: "local",
    objectName: relativePath,
  };
}

// Helper function to sign URLs (stub for local development)
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  // For local development, return a local URL
  // In a real implementation, this would generate signed URLs for cloud storage
  throw new Error(
    "Signed URLs are not supported for local file storage. Use direct file upload endpoints instead."
  );
}

// Create a singleton instance for easy import
export const objectStorageService = new ObjectStorageService();

export default objectStorageService;
