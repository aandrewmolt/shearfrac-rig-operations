import { createClient } from '@libsql/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Turso client
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader(corsHeaders).end();
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      case 'PUT':
        return handlePut(req, res);
      case 'DELETE':
        return handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Jobs sync error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { id, status } = req.query;

  try {
    if (id) {
      // Get specific job with all related data
      const jobResult = await turso.execute({
        sql: 'SELECT * FROM jobs WHERE id = ?',
        args: [id as string]
      });

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobResult.rows[0];

      // Get deployed equipment for this job
      const equipmentResult = await turso.execute({
        sql: `
          SELECT * FROM individual_equipment 
          WHERE job_id = ? AND status = 'deployed'
        `,
        args: [id as string]
      });

      return res.status(200).json({ 
        job,
        equipment: equipmentResult.rows
      });
    }

    if (status) {
      // Get jobs by status
      const result = await turso.execute({
        sql: 'SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC',
        args: [status as string]
      });
      return res.status(200).json({ data: result.rows });
    }

    // Get all jobs
    const result = await turso.execute(
      'SELECT * FROM jobs ORDER BY created_at DESC'
    );
    return res.status(200).json({ data: result.rows });
  } catch (error) {
    throw error;
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const body = req.body;

  try {
    const {
      id,
      name,
      client,
      location,
      wellCount,
      hasWellsideGauge,
      status,
      diagramData
    } = body;

    if (!id || !name) {
      return res.status(400).json({ error: 'Job ID and name required' });
    }

    // Check if job exists
    const existing = await turso.execute({
      sql: 'SELECT id FROM jobs WHERE id = ?',
      args: [id]
    });

    if (existing.rows.length > 0) {
      // Update existing job
      return handlePut(req, res);
    }

    // Create new job
    await turso.execute({
      sql: `
        INSERT INTO jobs (
          id, name, client, location, well_count, 
          has_wellside_gauge, status, diagram_data,
          created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'synced')
      `,
      args: [
        id,
        name,
        client || null,
        location || null,
        wellCount || 1,
        hasWellsideGauge ? 1 : 0,
        status || 'active',
        diagramData ? JSON.stringify(diagramData) : null
      ]
    });

    return res.status(201).json({ success: true, id });
  } catch (error) {
    throw error;
  }
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const body = req.body;
  
  const jobId = id || body.id;
  if (!jobId) {
    return res.status(400).json({ error: 'Job ID required' });
  }

  try {
    const updates: string[] = [];
    const args: any[] = [];

    // Map of body fields to database columns
    const fieldMap: Record<string, string> = {
      name: 'name',
      client: 'client',
      location: 'location',
      wellCount: 'well_count',
      hasWellsideGauge: 'has_wellside_gauge',
      status: 'status',
      diagramData: 'diagram_data',
      startDate: 'start_date',
      endDate: 'end_date',
      notes: 'notes'
    };

    for (const [bodyField, dbField] of Object.entries(fieldMap)) {
      if (body[bodyField] !== undefined) {
        updates.push(`${dbField} = ?`);
        
        // Special handling for certain fields
        if (bodyField === 'hasWellsideGauge') {
          args.push(body[bodyField] ? 1 : 0);
        } else if (bodyField === 'diagramData') {
          args.push(JSON.stringify(body[bodyField]));
        } else {
          args.push(body[bodyField]);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Always update timestamp and sync status
    updates.push('updated_at = CURRENT_TIMESTAMP', 'sync_status = ?');
    args.push('synced');
    
    // Add the ID for WHERE clause
    args.push(jobId);

    const sql = `UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`;
    const result = await turso.execute({ sql, args });

    // If diagram data was updated, also sync equipment allocations
    if (body.diagramData && body.diagramData.nodes) {
      await syncEquipmentAllocations(jobId as string, body.diagramData.nodes);
    }

    return res.status(200).json({ 
      success: true, 
      rowsAffected: result.rowsAffected 
    });
  } catch (error) {
    throw error;
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Job ID required' });
  }

  try {
    // First, deallocate all equipment from this job
    await turso.execute({
      sql: `
        UPDATE individual_equipment 
        SET status = 'available', job_id = NULL, node_id = NULL
        WHERE job_id = ?
      `,
      args: [id as string]
    });

    // Then soft delete the job
    await turso.execute({
      sql: `
        UPDATE jobs 
        SET status = 'deleted', sync_status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [id as string]
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    throw error;
  }
}

// Helper function to sync equipment allocations from diagram nodes
async function syncEquipmentAllocations(jobId: string, nodes: any[]) {
  try {
    // Get all currently deployed equipment for this job
    const currentResult = await turso.execute({
      sql: 'SELECT id, equipment_id FROM individual_equipment WHERE job_id = ?',
      args: [jobId]
    });
    
    const currentEquipment = new Set(
      currentResult.rows.map(row => row.equipment_id as string)
    );
    
    // Extract equipment IDs from nodes
    const nodeEquipment = new Set<string>();
    for (const node of nodes) {
      if (node.data?.equipmentId && node.data?.assigned) {
        nodeEquipment.add(node.data.equipmentId);
      }
    }
    
    // Deallocate equipment no longer in diagram
    const toDeallocate = Array.from(currentEquipment).filter(id => !nodeEquipment.has(id));
    if (toDeallocate.length > 0) {
      const placeholders = toDeallocate.map(() => '?').join(',');
      await turso.execute({
        sql: `
          UPDATE individual_equipment 
          SET status = 'available', job_id = NULL, node_id = NULL
          WHERE equipment_id IN (${placeholders}) AND job_id = ?
        `,
        args: [...toDeallocate, jobId]
      });
    }
    
    // Allocate new equipment from diagram
    const toAllocate = Array.from(nodeEquipment).filter(id => !currentEquipment.has(id));
    for (const equipmentId of toAllocate) {
      const node = nodes.find(n => n.data?.equipmentId === equipmentId);
      await turso.execute({
        sql: `
          UPDATE individual_equipment 
          SET status = 'deployed', job_id = ?, node_id = ?
          WHERE equipment_id = ?
        `,
        args: [jobId, node?.id || null, equipmentId]
      });
    }
  } catch (error) {
    console.error('Failed to sync equipment allocations:', error);
    // Don't throw - this is a best-effort sync
  }
}