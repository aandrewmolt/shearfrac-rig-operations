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
  const TURSO_URL = process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN;

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
          // Standardized query with consistent field names
          const result = await turso.execute(`
            SELECT 
              id,
              equipment_id as equipmentId,
              name,
              type_id as typeId,
              location_id as locationId,
              status,
              job_id as jobId,
              serial_number as serialNumber,
              purchase_date as purchaseDate,
              warranty_expiry as warrantyExpiry,
              notes,
              red_tag_reason as redTagReason,
              red_tag_photo as redTagPhoto,
              location_type as locationType,
              created_at as createdAt,
              updated_at as updatedAt
            FROM individual_equipment 
            LIMIT 100
          `);
          
          // Transform the results to ensure consistent format
          const normalizedData = result.rows.map(row => ({
            id: row.id,
            equipmentId: row.equipmentId || row.equipment_id,
            name: row.name,
            typeId: row.typeId || row.type_id,
            locationId: row.locationId || row.location_id,
            status: row.status,
            jobId: row.jobId || row.job_id,
            serialNumber: row.serialNumber || row.serial_number,
            purchaseDate: row.purchaseDate || row.purchase_date,
            warrantyExpiry: row.warrantyExpiry || row.warranty_expiry,
            notes: row.notes,
            redTagReason: row.redTagReason || row.red_tag_reason,
            redTagPhoto: row.redTagPhoto || row.red_tag_photo,
            locationType: row.locationType || row.location_type || 'storage',
            createdAt: row.createdAt || row.created_at,
            updatedAt: row.updatedAt || row.updated_at
          }));
          
          return res.status(200).json({ 
            success: true,
            data: normalizedData,
            count: normalizedData.length 
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
              sql: `UPDATE individual_equipment 
                    SET status = ?, 
                        job_id = ?,
                        location_type = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE equipment_id = ? OR id = ?`,
              args: ['deployed', jobId, 'job', equipmentId, equipmentId]
            });
            
            // Log the allocation
            await turso.execute({
              sql: `INSERT INTO equipment_sync_log 
                    (equipment_id, action, job_id, synced_at) 
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
              args: [equipmentId, 'allocate', jobId]
            }).catch(err => {
              // Log table might not exist, ignore error
              console.log('Could not log allocation:', err.message);
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
            // Get the current job_id before deallocating
            const currentState = await turso.execute({
              sql: 'SELECT job_id FROM individual_equipment WHERE equipment_id = ? OR id = ?',
              args: [equipmentId, equipmentId]
            });
            
            const currentJobId = currentState.rows[0]?.job_id;
            
            await turso.execute({
              sql: `UPDATE individual_equipment 
                    SET status = ?, 
                        job_id = NULL,
                        location_type = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE equipment_id = ? OR id = ?`,
              args: ['available', 'storage', equipmentId, equipmentId]
            });
            
            // Log the deallocation
            if (currentJobId) {
              await turso.execute({
                sql: `INSERT INTO equipment_sync_log 
                      (equipment_id, action, job_id, synced_at) 
                      VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
                args: [equipmentId, 'deallocate', currentJobId]
              }).catch(err => {
                console.log('Could not log deallocation:', err.message);
              });
            }
            
            return res.status(200).json({ success: true, action: 'deallocated' });
          } catch (error) {
            return res.status(500).json({ error: error.message });
          }
        }

        // Create new equipment
        const { equipmentId, name, typeId, locationId, status } = body || {};
        if (!equipmentId || !name || !typeId) {
          return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['equipmentId', 'name', 'typeId'],
            received: { equipmentId, name, typeId }
          });
        }

        const id = `eq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        
        try {
          await turso.execute({
            sql: `INSERT INTO individual_equipment 
                  (id, equipment_id, name, type_id, location_id, status, location_type, created_at, updated_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              id, 
              equipmentId, 
              name, 
              typeId, 
              locationId || 'midland-office', 
              status || 'available',
              'storage',
              timestamp,
              timestamp
            ]
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
          // Build dynamic update query
          const updateFields = [];
          const updateArgs = [];
          
          // Map of allowed fields to update
          const fieldMap = {
            name: 'name',
            typeId: 'type_id',
            locationId: 'location_id',
            status: 'status',
            jobId: 'job_id',
            serialNumber: 'serial_number',
            notes: 'notes',
            locationType: 'location_type'
          };
          
          Object.entries(body || {}).forEach(([key, value]) => {
            if (fieldMap[key] && value !== undefined) {
              updateFields.push(`${fieldMap[key]} = ?`);
              updateArgs.push(value);
            }
          });
          
          if (updateFields.length > 0) {
            // Always update the updated_at timestamp
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateArgs.push(updateId, updateId); // For WHERE clause
            
            await turso.execute({
              sql: `UPDATE individual_equipment 
                    SET ${updateFields.join(', ')} 
                    WHERE id = ? OR equipment_id = ?`,
              args: updateArgs
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
          // Check if equipment exists and get its details
          const existing = await turso.execute({
            sql: 'SELECT * FROM individual_equipment WHERE id = ? OR equipment_id = ?',
            args: [deleteId, deleteId]
          });
          
          if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Equipment not found' });
          }
          
          const equipment = existing.rows[0];
          
          // Check if equipment is currently deployed
          if (equipment.status === 'deployed' && equipment.job_id) {
            return res.status(400).json({ 
              error: 'Cannot delete deployed equipment',
              message: 'Please deallocate the equipment from the job first'
            });
          }
          
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