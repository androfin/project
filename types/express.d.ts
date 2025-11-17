import type { User as DbUser } from "../shared/schema";

declare global {
  namespace Express {
    // Extend Express.User to match the database User type
    interface User extends DbUser {}
  }
}

export {};
