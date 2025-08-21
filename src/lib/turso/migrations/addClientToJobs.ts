import { turso } from '../client';

export async function addClientToJobs() {
  console.log('🔧 Adding client column to jobs table...');
  
  try {
    // Add client column to jobs table
    await turso.execute(`
      ALTER TABLE jobs ADD COLUMN client TEXT
    `);
    
    console.log('✅ Successfully added client column to jobs table');
  } catch (error: any) {
    if (error.message?.includes('duplicate column name')) {
      console.log('ℹ️ Client column already exists in jobs table');
    } else {
      console.error('❌ Error adding client column:', error);
      throw error;
    }
  }
}

// Run the migration
if (import.meta.env.MODE !== 'test') {
  addClientToJobs().catch(console.error);
}