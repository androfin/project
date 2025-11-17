import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import postgres from 'postgres';
import { drizzle as drizzlePostgresJS } from 'drizzle-orm/postgres-js';
import * as schema from '@shared/schema';

// Validate that DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?\n" +
    "Please check your .env file and ensure DATABASE_URL is properly configured.\n" +
    "Example: DATABASE_URL=postgresql://username:password@localhost:5432/database_name"
  );
}

// Parse DATABASE_URL to extract connection details for better error handling
let parsedDbConfig;
try {
  const url = new URL(process.env.DATABASE_URL);
  parsedDbConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1), // Remove leading slash
    user: url.username,
    password: url.password,
  };
} catch (error) {
  throw new Error(
    `Invalid DATABASE_URL format: ${process.env.DATABASE_URL}\n` +
    "Expected format: postgresql://username:password@host:port/database_name"
  );
}

// Database connection configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // how long to wait for a connection to be established
  maxUses: 7500, // close a client after it has been used this many times (prevents memory leaks)
};

// Create PostgreSQL connection pool
export const pool = new Pool(dbConfig);

// Event listeners for connection pool
pool.on('connect', (client) => {
  console.log('Database connection established');
});

pool.on('error', (err, client) => {
  console.error('Database connection error:', err.message);
  console.error('Stack trace:', err.stack);
});

pool.on('remove', (client) => {
  console.log('Database connection removed from pool');
});

// Test database connection on startup
async function testDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('Database connection test successful');
    console.log('Database time:', result.rows[0].current_time);
    console.log('Database version:', result.rows[0].version.split(',')[0]);
  } catch (error) {
    console.error('Database connection test failed:');
    console.error('Error details:', error);
    
    // Provide helpful troubleshooting information
    console.log('Troubleshooting tips:');
    console.log('1. Check if PostgreSQL is running: sudo service postgresql status');
    console.log('2. Verify DATABASE_URL in your .env file');
    console.log('3. Ensure the database exists: createdb your_database_name');
    console.log('4. Check if user has permissions to access the database');
    
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Initialize Drizzle ORM with the connection pool
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV === 'development', // Enable query logging in development
});

// Alternative: Using postgres.js driver (commented out but available as option)
/*
// postgres.js connection (alternative to pg pool)
export const postgresClient = postgres(process.env.DATABASE_URL!, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false, // Set to true if you want to use prepared statements
});

// Drizzle instance with postgres.js
export const dbPostgresJS = drizzlePostgresJS(postgresClient, { 
  schema,
  logger: process.env.NODE_ENV === 'development',
});
*/

// Database health check function
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  details: string;
  responseTime?: number;
}> {
  const startTime = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      // Check connection pool stats
      const poolStats = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      };
      
      return {
        status: 'healthy',
        details: `Database is responding normally. Response time: ${responseTime}ms. Pool stats: ${JSON.stringify(poolStats)}`,
        responseTime,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      details: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime,
    };
  }
}

// Graceful shutdown function
export async function closeDatabaseConnections(): Promise<void> {
  console.log('Closing database connections...');
  
  try {
    // End the connection pool
    await pool.end();
    console.log('Database connections closed successfully');
  } catch (error) {
    console.error('Error closing database connections:', error);
    throw error;
  }
}

// Database migration helper (for manual migrations if needed)
export async function runManualMigration(migrationSQL: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    console.log('Manual migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Manual migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Connection retry function for startup
export async function connectWithRetry(
  maxRetries: number = 5,
  retryInterval: number = 5000
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${maxRetries}...`);
      await testDatabaseConnection();
      console.log('Database connected successfully!');
      return;
    } catch (error) {
      lastError = error as Error;
      console.log(`Connection attempt ${attempt} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        console.log(`Retrying in ${retryInterval / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        // Exponential backoff
        retryInterval = Math.min(retryInterval * 1.5, 30000); // Max 30 seconds
      }
    }
  }
  
  throw new Error(
    `Failed to connect to database after ${maxRetries} attempts. Last error: ${lastError?.message}`
  );
}

// Initialize database connection on module load
(async () => {
  if (process.env.NODE_ENV !== 'test') {
    try {
      await connectWithRetry();
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      process.exit(1);
    }
  }
})().catch(error => {
  console.error('Unexpected error during database initialization:', error);
  process.exit(1);
});

// Export connection details (without password) for debugging
export const connectionInfo = {
  host: parsedDbConfig.host,
  port: parsedDbConfig.port,
  database: parsedDbConfig.database,
  user: parsedDbConfig.user,
  maxConnections: dbConfig.max,
};

export default {
  db,
  pool,
  checkDatabaseHealth,
  closeDatabaseConnections,
  runManualMigration,
  connectWithRetry,
  connectionInfo,
};
