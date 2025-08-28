import { createClient } from '@libsql/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Turso client
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('Starting scheduled sync job');
  
  try {
    const results = {
      equipment: { synced: 0, conflicts: 0, errors: 0 },
      jobs: { synced: 0, conflicts: 0, errors: 0 },
      timestamp: new Date().toISOString()
    };
    
    // Sync equipment status from jobs
    await syncEquipmentFromJobs(results);
    
    // Check for orphaned equipment
    await cleanupOrphanedEquipment(results);
    
    // Update sync timestamps
    await updateSyncTimestamps();
    
    console.log('Sync job completed:', results);
    return res.status(200).json({ 
      success: true, 
      results 
    });
  } catch (error) {
    console.error('Cron sync error:', error);
    return res.status(500).json({ 
      error: 'Sync job failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function syncEquipmentFromJobs(results: any) {
  try {
    // Get all active jobs with their diagram data
    const jobsResult = await turso.execute(`
      SELECT id, name, nodes, edges 
      FROM jobs 
      WHERE status IN ('active', 'pending', 'in_progress')
    `);
    
    for (const job of jobsResult.rows) {
      try {
        const nodes = job.nodes ? JSON.parse(job.nodes as string) : [];
        const jobId = job.id as string;
        
        // Extract equipment IDs from nodes
        const equipmentInDiagram = new Set<string>();
        for (const node of nodes) {
          if (node.data?.equipmentId && node.data?.assigned) {
            equipmentInDiagram.add(node.data.equipmentId);
          }
        }
        
        // Get currently deployed equipment for this job
        const deployedResult = await turso.execute({
          sql: 'SELECT equipment_id FROM individual_equipment WHERE job_id = ?',
          args: [jobId]
        });
        
        const currentlyDeployed = new Set(
          deployedResult.rows.map(row => row.equipment_id as string)
        );
        
        // Find discrepancies
        const toAllocate = Array.from(equipmentInDiagram).filter(id => !currentlyDeployed.has(id));
        const toDeallocate = Array.from(currentlyDeployed).filter(id => !equipmentInDiagram.has(id));
        
        // Allocate missing equipment
        for (const equipmentId of toAllocate) {
          await turso.execute({
            sql: `
              UPDATE individual_equipment 
              SET status = 'deployed', job_id = ?, sync_status = 'synced', synced_at = CURRENT_TIMESTAMP
              WHERE equipment_id = ?
            `,
            args: [jobId, equipmentId]
          });
          results.equipment.synced++;
        }
        
        // Deallocate equipment no longer in diagram
        for (const equipmentId of toDeallocate) {
          await turso.execute({
            sql: `
              UPDATE individual_equipment 
              SET status = 'available', job_id = NULL, node_id = NULL, 
                  sync_status = 'synced', synced_at = CURRENT_TIMESTAMP
              WHERE equipment_id = ?
            `,
            args: [equipmentId]
          });
          results.equipment.synced++;
        }
        
      } catch (jobError) {
        console.error(`Failed to sync job ${job.id}:`, jobError);
        results.jobs.errors++;
      }
    }
  } catch (error) {
    console.error('Failed to sync equipment from jobs:', error);
    throw error;
  }
}

async function cleanupOrphanedEquipment(results: any) {
  try {
    // Find equipment deployed to non-existent or deleted jobs
    const orphanedResult = await turso.execute(`
      SELECT ie.id, ie.equipment_id, ie.job_id 
      FROM individual_equipment ie
      LEFT JOIN jobs j ON ie.job_id = j.id
      WHERE ie.job_id IS NOT NULL 
        AND (j.id IS NULL OR j.status = 'deleted')
    `);
    
    for (const orphan of orphanedResult.rows) {
      await turso.execute({
        sql: `
          UPDATE individual_equipment 
          SET status = 'available', job_id = NULL, node_id = NULL,
              sync_status = 'synced', synced_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [orphan.id]
      });
      results.equipment.synced++;
    }
    
    console.log(`Cleaned up ${orphanedResult.rows.length} orphaned equipment items`);
  } catch (error) {
    console.error('Failed to cleanup orphaned equipment:', error);
    throw error;
  }
}

async function updateSyncTimestamps() {
  try {
    // Mark all pending sync items as synced if they're older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    await turso.execute({
      sql: `
        UPDATE individual_equipment 
        SET sync_status = 'synced', synced_at = CURRENT_TIMESTAMP
        WHERE sync_status = 'pending' AND created_at < ?
      `,
      args: [oneHourAgo]
    });
    
    await turso.execute({
      sql: `
        UPDATE jobs 
        SET sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
        WHERE sync_status = 'pending' AND created_at < ?
      `,
      args: [oneHourAgo]
    });
  } catch (error) {
    console.error('Failed to update sync timestamps:', error);
    throw error;
  }
}