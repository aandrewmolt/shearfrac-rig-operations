import { turso } from '../client';

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

// This file is meant to be imported, not run directly