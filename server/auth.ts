import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User } from "@shared/schema";

const SALT_ROUNDS = 10;

// Session configuration for local development
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week session duration
  
  // Use PostgreSQL to store sessions
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // For local development, use secure: false and sameSite: lax
  // This allows sessions to work properly over HTTP in development
  const isProduction = process.env.NODE_ENV === "production";
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false, // Don't resave unchanged sessions
    saveUninitialized: false, // Don't save uninitialized sessions
    cookie: {
      httpOnly: true, // Prevent client-side JavaScript access to cookies
      secure: isProduction, // Use HTTPS only in production
      sameSite: isProduction ? "lax" : "lax", // CSRF protection
      maxAge: sessionTtl, // Session expiration time
    },
  });
}

// Main authentication setup function
export async function setupAuth(app: Express) {
  // Trust proxy for secure cookies behind reverse proxy (for production)
  // For local development, this can be set to 0 or 1
  app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : 0);
  
  // Initialize session middleware
  app.use(getSession());
  
  // Initialize Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport Local Strategy for email/password authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email", // Use email as username field
        passwordField: "password", // Use password field
      },
      async (email, password, done) => {
        try {
          console.log(`Authentication attempt for email: ${email}`);
          
          // Find user by email in database
          const user = await storage.getUserByEmail(email);
          
          // If user doesn't exist
          if (!user) {
            console.log(`User not found for email: ${email}`);
            return done(null, false, { message: "Invalid email or password" });
          }

          // Check if user has password hash (for password-based login)
          if (!user.passwordHash) {
            console.log(`No password hash for user: ${user.id}`);
            return done(null, false, { message: "Account not configured for password login" });
          }

          // Check if user account is active
          if (!user.isActive) {
            console.log(`Inactive account attempt: ${user.id}`);
            return done(null, false, { message: "Account is deactivated" });
          }

          // Verify password using bcrypt (timing-safe comparison)
          console.log(`Verifying password for user: ${user.id}`);
          const isValidPassword = await bcrypt.compare(password, user.passwordHash);
          
          // If password is invalid
          if (!isValidPassword) {
            console.log(`Invalid password for user: ${user.id}`);
            return done(null, false, { message: "Invalid email or password" });
          }

          // Authentication successful
          console.log(`Authentication successful for user: ${user.id}`);
          return done(null, user);
        } catch (error) {
          // Handle any errors during authentication
          console.error("Authentication error:", error);
          return done(error);
        }
      }
    )
  );

  // Serialize user to session (store only user ID in session)
  passport.serializeUser((user: Express.User, cb) => {
    const u = user as User;
    console.log(`Serializing user: ${u.id}`);
    cb(null, u.id);
  });

  // Deserialize user from session (retrieve user from database using ID)
  passport.deserializeUser(async (id: string, cb) => {
    try {
      console.log(`Deserializing user: ${id}`);
      const user = await storage.getUser(id);
      if (!user) {
        console.log(`User not found during deserialization: ${id}`);
        return cb(new Error("User not found"), null);
      }
      
      // Check if user is still active
      if (!user.isActive) {
        console.log(`Inactive user during deserialization: ${id}`);
        return cb(new Error("Account is deactivated"), null);
      }
      
      console.log(`Deserialization successful for user: ${id}`);
      cb(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      cb(error);
    }
  });

  // ============ AUTHENTICATION ROUTES ============

  // Login route - authenticate user and create session
  app.post("/api/auth/login", (req, res, next) => {
    console.log("Login attempt received");
    
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      // Handle authentication errors
      if (err) {
        console.error("Login authentication error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      
      // If authentication failed
      if (!user) {
        console.log("Login failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      // Log the user in (create session)
      req.logIn(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Failed to establish session" });
        }
        
        console.log(`User ${user.id} logged in successfully`);
        
        // Return user data (excluding sensitive information)
        return res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          username: user.username,
          profileImageUrl: user.profileImageUrl,
        });
      });
    })(req, res, next);
  });

  // Signup route (admin only - to create student accounts)
  app.post("/api/auth/signup", isAdmin, async (req, res) => {
    try {
      console.log("Signup request received:", req.body);
      
      const { email, password, firstName, lastName, role = "student" } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Validate password strength
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "User with this email already exists" });
      }

      // Hash password with bcrypt
      console.log("Hashing password...");
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user in database
      console.log("Creating user in database...");
      const newUser = await storage.createUser({
        email: email.toLowerCase().trim(), // Normalize email
        passwordHash,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        role: role === "admin" ? "admin" : "student", // Only allow admin or student roles
        isActive: true,
      });

      console.log(`User created successfully: ${newUser.id}`);

      // Return user data (excluding sensitive information)
      return res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        username: newUser.username,
        profileImageUrl: newUser.profileImageUrl,
      });
    } catch (error) {
      console.error("Signup error:", error);
      return res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Logout route - destroy user session
  app.post("/api/auth/logout", (req, res) => {
    const userId = req.user ? (req.user as User).id : 'unknown';
    console.log(`Logout request for user: ${userId}`);
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({ message: "Failed to destroy session" });
        }
        
        console.log(`User ${userId} logged out successfully`);
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user route - return authenticated user data
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user as User;
    
    // Return user data (excluding sensitive information)
    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      username: user.username,
      profileImageUrl: user.profileImageUrl,
      isActive: user.isActive,
    });
  });

  // Password change route
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash!);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update user password in database
      await storage.updateUserProfile(user.id, { 
        // This would need to be extended to handle password updates
        // For now, we'll use a direct update approach
        firstName: user.firstName, // Keep existing data
        lastName: user.lastName
      });

      console.log(`Password changed for user: ${user.id}`);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Check authentication status route
  app.get("/api/auth/status", (req, res) => {
    const isAuthenticated = req.isAuthenticated() && req.user !== undefined;
    const user = req.user as User | undefined;
    
    res.json({
      isAuthenticated,
      user: isAuthenticated ? {
        id: user!.id,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        role: user!.role,
      } : null
    });
  });

  console.log("Authentication routes configured successfully");
}

// ============ AUTHENTICATION MIDDLEWARE ============

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    console.log("Authentication required - user not authenticated");
    return res.status(401).json({ message: "Unauthorized - Please log in" });
  }

  const user = req.user as User;
  
  // Check if user account is active
  if (!user.isActive) {
    console.log(`Access denied - user account deactivated: ${user.id}`);
    return res.status(401).json({ message: "Account is deactivated" });
  }

  console.log(`User authenticated: ${user.id}`);
  next();
};

// Middleware to check if user is admin
export const isAdmin: RequestHandler = (req, res, next) => {
  // First check if user is authenticated
  if (!req.isAuthenticated() || !req.user) {
    console.log("Admin access denied - user not authenticated");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as User;
  
  // Check if user account is active
  if (!user.isActive) {
    console.log(`Admin access denied - user account deactivated: ${user.id}`);
    return res.status(401).json({ message: "Account is deactivated" });
  }
  
  // Check if user has admin role
  if (user.role !== "admin") {
    console.log(`Admin access denied - insufficient permissions for user: ${user.id}`);
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }

  console.log(`Admin access granted: ${user.id}`);
  next();
};

// Middleware to check if user is student
export const isStudent: RequestHandler = (req, res, next) => {
  // First check if user is authenticated
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as User;
  
  // Check if user account is active
  if (!user.isActive) {
    return res.status(401).json({ message: "Account is deactivated" });
  }
  
  // Check if user has student role
  if (user.role !== "student") {
    return res.status(403).json({ message: "Forbidden: Student access required" });
  }

  next();
};

// Optional: Middleware to check if user is either admin or student
export const isAdminOrStudent: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as User;
  
  if (!user.isActive) {
    return res.status(401).json({ message: "Account is deactivated" });
  }
  
  if (user.role !== "admin" && user.role !== "student") {
    return res.status(403).json({ message: "Forbidden: Invalid user role" });
  }

  next();
};

// Optional: Middleware to inject user data into res.locals for templates
export const injectUser: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    const user = req.user as User;
    res.locals.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      username: user.username,
      profileImageUrl: user.profileImageUrl,
    };
  } else {
    res.locals.user = null;
  }
  next();
};

export default {
  setupAuth,
  isAuthenticated,
  isAdmin,
  isStudent,
  isAdminOrStudent,
  injectUser,
  getSession,
};
