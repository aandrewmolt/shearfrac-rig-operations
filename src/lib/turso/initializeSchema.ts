import { createSchema } from './schema';
import { addJobStatusFields } from './migrations/addJobStatusFields';

let schemaInitialized = false;

export async function ensureSchemaInitialized() {
  if (schemaInitialized) {
    return true;
  }

  try {
    console.log('🔨 Ensuring database schema is initialized...');
    await createSchema();
    
    // Run migrations
    console.log('🔧 Running database migrations...');
    try {
      await addJobStatusFields();
    } catch (migrationError: any) {
      // Ignore if columns already exist
      if (!migrationError.message?.includes('duplicate column')) {
        console.error('Migration error:', migrationError);
      }
    }
    
    schemaInitialized = true;
    console.log('✅ Database schema initialized successfully');
    return true;
  } catch (error: any) {
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