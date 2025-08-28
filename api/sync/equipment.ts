import { createClient } from '@libsql/client/web';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Turso client
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method } = req;
    const { action } = req.query;

    switch (method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res, action as string);
      case 'PUT':
        return handlePut(req, res);
      case 'DELETE':
        return handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { type, jobId, equipmentId } = req.query;

  try {
    if (type === 'individual') {
      // Get individual equipment
      const result = await turso.execute(`
        SELECT * FROM individual_equipment 
        WHERE sync_status != 'deleted' OR sync_status IS NULL
        ORDER BY created_at DESC
      `);
      return res.status(200).json({ data: result.rows });
    }

    if (type === 'deployed' && jobId) {
      // Get deployed equipment for a job
      const result = await turso.execute({
        sql: `
          SELECT * FROM individual_equipment 
          WHERE job_id = ? AND status = 'deployed'
          ORDER BY equipment_id ASC
        `,
        args: [jobId as string]
      });
      return res.status(200).json({ data: result.rows });
    }

    if (equipmentId) {
      // Get specific equipment
      const result = await turso.execute({
        sql: 'SELECT * FROM individual_equipment WHERE id = ?',
        args: [equipmentId as string]
      });
      return res.status(200).json({ data: result.rows[0] || null });
    }

    // Get all equipment
    const result = await turso.execute('SELECT * FROM individual_equipment');
    return res.status(200).json({ data: result.rows });
  } catch (error) {
    throw error;
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse, action?: string) {
  const body = req.body;

  try {
    if (action === 'sync-status') {
      // Update sync status for multiple equipment items
      const { equipmentIds, status, jobId } = body;
      
      if (!equipmentIds || !Array.isArray(equipmentIds)) {
        return res.status(400).json({ error: 'Equipment IDs required' });
      }

      const placeholders = equipmentIds.map(() => '?').join(',');
      const sql = `
        UPDATE individual_equipment 
        SET status = ?, job_id = ?, sync_status = 'synced', synced_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders})
      `;
      
      await turso.execute({
        sql,
        args: [status, jobId || null, ...equipmentIds]
      });

      return res.status(200).json({ success: true, updated: equipmentIds.length });
    }

    if (action === 'allocate') {
      // Allocate equipment to a job
      const { equipmentId, jobId, nodeId } = body;
      
      if (!equipmentId || !jobId) {
        return res.status(400).json({ error: 'Equipment ID and Job ID required' });
      }

      await turso.execute({
        sql: `
          UPDATE individual_equipment 
          SET status = 'deployed', job_id = ?, node_id = ?, 
              sync_status = 'synced', synced_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [jobId, nodeId || null, equipmentId]
      });

      return res.status(200).json({ success: true });
    }

    if (action === 'deallocate') {
      // Deallocate equipment from a job
      const { equipmentId } = body;
      
      if (!equipmentId) {
        return res.status(400).json({ error: 'Equipment ID required' });
      }

      await turso.execute({
        sql: `
          UPDATE individual_equipment 
          SET status = 'available', job_id = NULL, node_id = NULL,
              sync_status = 'synced', synced_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [equipmentId]
      });

      return res.status(200).json({ success: true });
    }

    // Create new equipment
    const { equipmentId, name, typeId, locationId, status } = body;
    
    if (!equipmentId || !typeId || !locationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await turso.execute({
      sql: `
        INSERT INTO individual_equipment (
          id, equipment_id, name, type_id, location_id, status, 
          sync_status, created_at, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'synced', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      args: [id, equipmentId, name, typeId, locationId, status || 'available']
    });

    return res.status(201).json({ success: true, id });
  } catch (error) {
    throw error;
  }
}

async function handlePut(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const body = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Equipment ID required' });
  }

  try {
    const updates: string[] = [];
    const args: any[] = [];

    // Build dynamic update query
    const allowedFields = ['equipment_id', 'name', 'status', 'job_id', 'node_id', 'location_id', 'notes'];
    
    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (body[camelField] !== undefined) {
        updates.push(`${field} = ?`);
        args.push(body[camelField]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Always update sync status and timestamp
    updates.push('sync_status = ?', 'synced_at = CURRENT_TIMESTAMP');
    args.push('synced');
    
    // Add the ID at the end for the WHERE clause
    args.push(id);

    const sql = `
      UPDATE individual_equipment 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    const result = await turso.execute({ sql, args });

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
    return res.status(400).json({ error: 'Equipment ID required' });
  }

  try {
    // Soft delete by marking sync_status
    await turso.execute({
      sql: `
        UPDATE individual_equipment 
        SET sync_status = 'deleted', synced_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [id as string]
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    throw error;
  }
}