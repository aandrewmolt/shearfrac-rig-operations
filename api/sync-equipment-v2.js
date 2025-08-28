export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check environment variables first
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

  if (!TURSO_URL || !TURSO_TOKEN) {
    return res.status(503).json({ 
      error: 'Database connection not configured',
      message: 'Missing environment variables',
      debug: {
        hasUrl: !!TURSO_URL,
        hasToken: !!TURSO_TOKEN
      }
    });
  }

  try {
    // Dynamic import to avoid initialization issues
    const { createClient } = await import('@libsql/client/web');
    
    const turso = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });

    const { method, query, body } = req;

    switch (method) {
      case 'GET':
        try {
          // Test with a simple query first
          const result = await turso.execute('SELECT * FROM individual_equipment LIMIT 10');
          return res.status(200).json({ 
            success: true,
            data: result.rows,
            count: result.rows.length 
          });
        } catch (dbError) {
          // If table doesn't exist or other DB error
          return res.status(200).json({ 
            success: false,
            message: 'Database query failed',
            error: dbError.message,
            hint: 'Table might not exist. Try initializing the database first.'
          });
        }

      case 'POST':
        // Handle allocate/deallocate actions
        if (query.action === 'allocate') {
          const { equipmentId, jobId } = body || {};
          if (!equipmentId || !jobId) {
            return res.status(400).json({ error: 'Missing equipmentId or jobId' });
          }
          
          try {
            await turso.execute({
              sql: 'UPDATE individual_equipment SET status = ?, job_id = ? WHERE equipment_id = ? OR id = ?',
              args: ['deployed', jobId, equipmentId, equipmentId]
            });
            return res.status(200).json({ success: true, action: 'allocated' });
          } catch (error) {
            return res.status(500).json({ error: error.message });
          }
        }

        if (query.action === 'deallocate') {
          const { equipmentId } = body || {};
          if (!equipmentId) {
            return res.status(400).json({ error: 'Missing equipmentId' });
          }
          
          try {
            await turso.execute({
              sql: 'UPDATE individual_equipment SET status = ?, job_id = NULL WHERE equipment_id = ? OR id = ?',
              args: ['available', equipmentId, equipmentId]
            });
            return res.status(200).json({ success: true, action: 'deallocated' });
          } catch (error) {
            return res.status(500).json({ error: error.message });
          }
        }

        // Create new equipment
        const { equipmentId, name, typeId, locationId, status } = body || {};
        if (!equipmentId || !name) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const id = `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          await turso.execute({
            sql: 'INSERT INTO individual_equipment (id, equipment_id, name, type_id, location_id, status) VALUES (?, ?, ?, ?, ?, ?)',
            args: [id, equipmentId, name, typeId || '', locationId || '', status || 'available']
          });
          return res.status(201).json({ success: true, id });
        } catch (error) {
          return res.status(500).json({ error: error.message });
        }

      case 'PUT':
        // Update equipment
        const updateId = query.id;
        if (!updateId) {
          return res.status(400).json({ error: 'Equipment ID required' });
        }

        try {
          // Simple status update for now
          const { status: newStatus } = body || {};
          if (newStatus) {
            await turso.execute({
              sql: 'UPDATE individual_equipment SET status = ? WHERE id = ? OR equipment_id = ?',
              args: [newStatus, updateId, updateId]
            });
          }
          return res.status(200).json({ success: true, updated: updateId });
        } catch (error) {
          return res.status(500).json({ error: error.message });
        }

      case 'DELETE':
        // Delete equipment
        const deleteId = query.id;
        if (!deleteId) {
          return res.status(400).json({ error: 'Equipment ID required' });
        }

        try {
          await turso.execute({
            sql: 'DELETE FROM individual_equipment WHERE id = ? OR equipment_id = ?',
            args: [deleteId, deleteId]
          });
          return res.status(200).json({ success: true, deleted: deleteId });
        } catch (error) {
          return res.status(500).json({ error: error.message });
        }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Sync equipment error:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      message: error.message,
      type: error.constructor.name
    });
  }
}