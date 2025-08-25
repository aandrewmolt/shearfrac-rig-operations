import { turso } from './client';

let schemaInitialized = false;

export async function initializeSchema() {
  try {
    // Check if tables exist first
    const result = await turso.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='users'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Database schema already initialized');
      schemaInitialized = true;
      return true;
    }

    console.log('🔨 Initializing database schema...');
    
    // Create tables
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database schema initialized successfully');
    schemaInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error);
    return false;
  }
}

// Export the function that was expected
export async function ensureSchemaInitialized() {
  if (!schemaInitialized) {
    return await initializeSchema();
  }
  return true;
}