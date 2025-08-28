import { createClient } from '@libsql/client/web';

// Initialize Turso client with error handling
let turso;
try {
  turso = createClient({
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
} catch (error) {
  console.error('Failed to initialize Turso client:', error);
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if Turso is initialized
  if (!turso) {
    return res.status(500).json({ 
      error: 'Database connection not configured',
      message: 'Turso client initialization failed'
    });
  }

  try {
    const { method, query, body } = req;

    switch (method) {
      case 'GET':
        // Get equipment
        if (query.id) {
          const result = await turso.execute({
            sql: 'SELECT * FROM individual_equipment WHERE id = ?',
            args: [query.id]
          });
          return res.status(200).json({ data: result.rows[0] || null });
        }
        
        // Get all equipment
        const allResult = await turso.execute('SELECT * FROM individual_equipment LIMIT 100');
        return res.status(200).json({ data: allResult.rows });

      case 'POST':
        // Handle different actions
        if (query.action === 'allocate') {
          const { equipmentId, jobId } = body;
          await turso.execute({
            sql: 'UPDATE individual_equipment SET status = ?, job_id = ? WHERE id = ?',
            args: ['deployed', jobId, equipmentId]
          });
          return res.status(200).json({ success: true });
        }

        if (query.action === 'deallocate') {
          const { equipmentId } = body;
          await turso.execute({
            sql: 'UPDATE individual_equipment SET status = ?, job_id = NULL WHERE id = ?',
            args: ['available', equipmentId]
          });
          return res.status(200).json({ success: true });
        }

        // Create new equipment
        const { equipmentId, name, typeId, locationId, status } = body;
        const id = `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await turso.execute({
          sql: `INSERT INTO individual_equipment (id, equipment_id, name, type_id, location_id, status) 
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [id, equipmentId, name, typeId, locationId, status || 'available']
        });
        
        return res.status(201).json({ success: true, id });

      case 'PUT':
        // Update equipment
        if (!query.id) {
          return res.status(400).json({ error: 'Equipment ID required' });
        }

        const updateFields = [];
        const updateArgs = [];
        
        Object.entries(body).forEach(([key, value]) => {
          if (key !== 'id') {
            updateFields.push(`${key} = ?`);
            updateArgs.push(value);
          }
        });

        if (updateFields.length > 0) {
          updateArgs.push(query.id);
          await turso.execute({
            sql: `UPDATE individual_equipment SET ${updateFields.join(', ')} WHERE id = ?`,
            args: updateArgs
          });
        }

        return res.status(200).json({ success: true });

      case 'DELETE':
        // Delete equipment
        if (!query.id) {
          return res.status(400).json({ error: 'Equipment ID required' });
        }

        await turso.execute({
          sql: 'DELETE FROM individual_equipment WHERE id = ?',
          args: [query.id]
        });

        return res.status(200).json({ success: true });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Equipment sync error:', error);
    return res.status(500).json({ 
      error: 'Database operation failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}