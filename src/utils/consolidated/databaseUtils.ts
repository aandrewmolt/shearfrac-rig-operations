import { createClient } from '@libsql/client/web';
import { getTursoClient as getMainTursoClient } from '@/lib/turso/client';

// =============================================================================
// DATABASE CLIENT MANAGEMENT
// =============================================================================

// Lazy initialization to avoid environment variable issues
let tursoClient: ReturnType<typeof createClient> | null = null;

export function getTursoClient() {
  if (!tursoClient) {
    const dbUrl = import.meta.env.VITE_TURSO_DATABASE_URL;
    
    // If no URL provided or file URL, use the main client which has mock support
    if (!dbUrl || dbUrl === '' || dbUrl.startsWith('file:')) {
      return getMainTursoClient();
    }

    // Create Turso client for production use
    tursoClient = createClient({
      url: dbUrl,
      authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
    });
  }
  return tursoClient;
}

// Export using Proxy for lazy initialization to avoid module initialization issues
export const turso = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop: string | symbol) {
    const client = getTursoClient();
    const value = (client as Record<string | symbol, unknown>)[prop];
    // If it's a function, bind it to the client to maintain correct 'this' context
    if (typeof value === 'function') {
      return (value as Function).bind(client);
    }
    return value;
  }
});

// Test connection
export async function testConnection() {
  try {
    const client = getTursoClient();
    await client.execute('SELECT 1');
    console.log('✅ Turso database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Turso database connection failed:', error);
    return false;
  }
}

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

// Database configuration types
interface DatabaseConfig {
  mode: string;
  turso: {
    available: boolean;
    url: string;
  };
  features: {
    realtime: boolean;
    fileStorage: boolean;
    authentication: boolean;
    cloudSync: boolean;
  };
}

// Database configuration - Respect environment variable
// Turso provides both local file mode and cloud sync
export const DATABASE_MODE = import.meta.env?.VITE_DATABASE_MODE || 'turso';

// Lazy-loaded configuration to avoid accessing env vars at module level
let _databaseConfig: DatabaseConfig | null = null;

export const getDatabaseConfig = () => {
  if (!_databaseConfig) {
    _databaseConfig = {
      mode: DATABASE_MODE,
      
      // Turso config
      turso: {
        available: true,
        get url() {
          return import.meta.env?.VITE_TURSO_DATABASE_URL || 'file:local.db';
        },
      },
      
      // Feature flags
      features: {
        realtime: true, // Turso supports real-time sync
        fileStorage: true, // Using Vercel Blob for file storage
        authentication: true, // Using Turso for auth
        cloudSync: true, // Turso syncs automatically
      }
    };
  }
  return _databaseConfig;
};

// Export for backward compatibility
export const databaseConfig = new Proxy({} as DatabaseConfig, {
  get(target, prop: keyof DatabaseConfig) {
    const config = getDatabaseConfig();
    return config[prop];
  }
});

// Helper to check if we're in offline mode
export const isOfflineMode = () => {
  const url = import.meta.env?.VITE_TURSO_DATABASE_URL;
  return !url || url.includes('file:');
};

// Helper to check if we have cloud features
export const hasCloudFeatures = () => {
  const url = import.meta.env?.VITE_TURSO_DATABASE_URL;
  return url && !url.includes('file:');
};

// =============================================================================
// SCHEMA INITIALIZATION
// =============================================================================

let schemaInitialized = false;

export async function ensureSchemaInitialized() {
  if (schemaInitialized) {
    return true;
  }

  try {
    console.log('🔨 Ensuring database schema is initialized...');
    // Import schema creation function
    const { createSchema } = await import('@/lib/turso/schema');
    await createSchema();
    
    // Run migrations
    console.log('🔧 Running database migrations...');
    try {
      await addJobStatusFields();
    } catch (migrationError: unknown) {
      // Ignore if columns already exist
      const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
      if (!errorMessage.includes('duplicate column')) {
        console.error('Migration error:', migrationError);
      }
    }
    
    schemaInitialized = true;
    console.log('✅ Database schema initialized successfully');
    return true;
  } catch (error: unknown) {
    // If error is about tables already existing, that's fine
    if (error.message?.includes('already exists')) {
      console.log('✅ Database schema already exists');
      schemaInitialized = true;
      return true;
    }
    
    console.error('❌ Failed to initialize database schema:', error);
    return false;
  }
}

// =============================================================================
// DATABASE MIGRATIONS
// =============================================================================

export async function addJobStatusFields() {
  console.log('🔧 Adding job status fields...');
  
  try {
    // Check if columns already exist
    const tableInfo = await turso.execute("PRAGMA table_info(jobs)");
    const columns = tableInfo.rows.map(row => row.name as string);
    
    // Add status column if it doesn't exist
    if (!columns.includes('status')) {
      console.log('Adding status column...');
      await turso.execute(`
        ALTER TABLE jobs 
        ADD COLUMN status TEXT DEFAULT 'pending'
      `);
    }
    
    // Add start_date column if it doesn't exist
    if (!columns.includes('start_date')) {
      console.log('Adding start_date column...');
      await turso.execute(`
        ALTER TABLE jobs 
        ADD COLUMN start_date DATETIME
      `);
    }
    
    // Add end_date column if it doesn't exist
    if (!columns.includes('end_date')) {
      console.log('Adding end_date column...');
      await turso.execute(`
        ALTER TABLE jobs 
        ADD COLUMN end_date DATETIME
      `);
    }
    
    console.log('✅ Job status fields added successfully');
  } catch (error) {
    console.error('❌ Error adding job status fields:', error);
    throw error;
  }
}

export async function addClientToJobs() {
  console.log('🔧 Adding client column to jobs table...');
  
  try {
    // Add client column to jobs table
    await turso.execute(`
      ALTER TABLE jobs ADD COLUMN client TEXT
    `);
    
    console.log('✅ Successfully added client column to jobs table');
  } catch (error: unknown) {
    if (error.message?.includes('duplicate column name')) {
      console.log('ℹ️ Client column already exists in jobs table');
    } else {
      console.error('❌ Error adding client column:', error);
      throw error;
    }
  }
}