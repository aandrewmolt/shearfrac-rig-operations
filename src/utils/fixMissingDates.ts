import { turso } from '@/lib/turso/client';

export async function fixMissingJobDates() {
  try {
    console.log('Fetching jobs with missing dates...');
    
    // Get all jobs with missing created_at or updated_at
    const result = await turso.execute({
      sql: 'SELECT * FROM jobs WHERE created_at IS NULL OR updated_at IS NULL',
      args: []
    });
    
    const jobs = result.rows;
    
    if (!jobs || jobs.length === 0) {
      console.log('No jobs with missing dates found');
      return { success: true, updated: 0 };
    }
    
    console.log(`Found ${jobs.length} jobs with missing dates`);
    
    // Set date to 1 week ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const dateString = oneWeekAgo.toISOString();
    
    // Update each job
    let updatedCount = 0;
    for (const job of jobs) {
      const updates: string[] = [];
      const args: (string | number)[] = [];
      
      if (!job.created_at) {
        updates.push('created_at = ?');
        args.push(dateString);
      }
      if (!job.updated_at) {
        updates.push('updated_at = ?');
        args.push(dateString);
      }
      
      if (updates.length > 0) {
        args.push(job.id);
        
        try {
          await turso.execute({
            sql: `UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`,
            args
          });
          
          console.log(`Updated job ${job.id} (${job.name}) with dates`);
          updatedCount++;
        } catch (updateError) {
          console.error(`Error updating job ${job.id}:`, updateError);
        }
      }
    }
    
    console.log(`Successfully updated ${updatedCount} jobs with creation dates`);
    return { success: true, updated: updatedCount };
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error };
  }
}

// Function to fix dates for all tables that might have missing dates
export async function fixAllMissingDates() {
  console.log('Starting comprehensive date fix...');
  
  // Fix jobs
  const jobResult = await fixMissingJobDates();
  console.log('Job date fix result:', jobResult);
  
  // You can add more tables here if needed
  // For example: equipment_items, individual_equipment, etc.
  
  return {
    jobs: jobResult
  };
}