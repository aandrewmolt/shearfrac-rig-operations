import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';

dotenv.config();

async function addClientToJobs() {
  console.log('🔄 Adding client field to jobs table...');
  
  const turso = createClient({
    url: process.env.VITE_TURSO_DATABASE_URL,
    authToken: process.env.VITE_TURSO_AUTH_TOKEN,
  });
  
  try {
    // Add client column to jobs table
    await turso.execute(`
      ALTER TABLE jobs ADD COLUMN client TEXT;
    `);
    
    console.log('✅ Successfully added client field to jobs table');
    
    // Update existing jobs to extract client from name if possible
    const jobs = await turso.execute('SELECT id, name FROM jobs');
    
    for (const job of jobs.rows) {
      const jobName = job.name;
      const dashIndex = jobName.indexOf(' - ');
      
      if (dashIndex > 0) {
        const client = jobName.substring(0, dashIndex).trim();
        const actualJobName = jobName.substring(dashIndex + 3).trim();
        
        await turso.execute({
          sql: 'UPDATE jobs SET client = ?, name = ? WHERE id = ?',
          args: [client, actualJobName, job.id]
        });
        
        console.log(`Updated job ${job.id}: client="${client}", name="${actualJobName}"`);
      }
    }
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    if (error.message?.includes('duplicate column name')) {
      console.log('ℹ️ Client column already exists');
    } else {
      console.error('❌ Failed to add client field:', error);
      process.exit(1);
    }
  }
}

addClientToJobs();