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
    console.error('Contacts sync error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { id, jobId, type } = req.query;

  try {
    if (id) {
      // Get specific contact
      const result = await turso.execute({
        sql: 'SELECT * FROM contacts WHERE id = ?',
        args: [id as string]
      });
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      
      const contact = parseContact(result.rows[0]);
      return res.status(200).json({ data: contact });
    }

    if (jobId) {
      // Get all contacts assigned to a specific job
      const result = await turso.execute({
        sql: `
          SELECT * FROM contacts 
          WHERE job_assignments LIKE ? 
          ORDER BY name ASC
        `,
        args: [`%"jobId":"${jobId}"%`]
      });
      
      const contacts = result.rows.map(parseContact);
      return res.status(200).json({ data: contacts });
    }

    if (type) {
      // Get contacts by type
      const result = await turso.execute({
        sql: 'SELECT * FROM contacts WHERE type = ? ORDER BY name ASC',
        args: [type as string]
      });
      
      const contacts = result.rows.map(parseContact);
      return res.status(200).json({ data: contacts });
    }

    // Get all contacts
    const result = await turso.execute('SELECT * FROM contacts ORDER BY name ASC');
    const contacts = result.rows.map(parseContact);
    return res.status(200).json({ data: contacts });
  } catch (error) {
    throw error;
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse, action?: string) {
  const body = req.body;

  try {
    if (action === 'assign-job') {
      // Assign contact to job
      const { contactId, jobId, jobName, client } = body;
      
      if (!contactId || !jobId) {
        return res.status(400).json({ error: 'Contact ID and Job ID required' });
      }

      // Get existing contact
      const contactResult = await turso.execute({
        sql: 'SELECT * FROM contacts WHERE id = ?',
        args: [contactId]
      });

      if (contactResult.rows.length === 0) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      const contact = parseContact(contactResult.rows[0]);
      const jobAssignments = contact.jobAssignments || [];
      
      // Check if already assigned
      const existingAssignment = jobAssignments.find(a => a.jobId === jobId);
      if (existingAssignment) {
        existingAssignment.active = true;
        existingAssignment.unassignedDate = undefined;
      } else {
        // Add new assignment
        jobAssignments.push({
          jobId,
          jobName: jobName || 'Unknown Job',
          client: client || 'Unknown Client',
          assignedDate: new Date().toISOString(),
          active: true
        });
      }

      // Update contact
      await turso.execute({
        sql: `
          UPDATE contacts 
          SET job_assignments = ?, 
              last_updated_date = date('now'),
              last_updated_time = time('now')
          WHERE id = ?
        `,
        args: [JSON.stringify(jobAssignments), contactId]
      });

      return res.status(200).json({ success: true });
    }

    if (action === 'unassign-job') {
      // Unassign contact from job
      const { contactId, jobId } = body;
      
      if (!contactId || !jobId) {
        return res.status(400).json({ error: 'Contact ID and Job ID required' });
      }

      // Get existing contact
      const contactResult = await turso.execute({
        sql: 'SELECT * FROM contacts WHERE id = ?',
        args: [contactId]
      });

      if (contactResult.rows.length === 0) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      const contact = parseContact(contactResult.rows[0]);
      const jobAssignments = contact.jobAssignments || [];
      
      // Mark assignment as inactive
      const assignment = jobAssignments.find(a => a.jobId === jobId);
      if (assignment) {
        assignment.active = false;
        assignment.unassignedDate = new Date().toISOString();
      }

      // Update contact
      await turso.execute({
        sql: `
          UPDATE contacts 
          SET job_assignments = ?, 
              last_updated_date = date('now'),
              last_updated_time = time('now')
          WHERE id = ?
        `,
        args: [JSON.stringify(jobAssignments), contactId]
      });

      return res.status(200).json({ success: true });
    }

    // Create new contact
    const {
      type,
      name,
      company,
      title,
      phone,
      email,
      job,
      crew,
      shift,
      notes,
      jobAssignments
    } = body;
    
    if (!type || !name) {
      return res.status(400).json({ error: 'Contact type and name required' });
    }

    const id = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await turso.execute({
      sql: `
        INSERT INTO contacts (
          id, type, name, company, title, phone, email, job, crew, shift,
          notes, job_assignments, created_date, last_updated_date, last_updated_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), date('now'), time('now'))
      `,
      args: [
        id,
        type,
        name,
        company || null,
        title || null,
        phone || null,
        email || null,
        job || null,
        crew || null,
        shift || null,
        notes || null,
        jobAssignments ? JSON.stringify(jobAssignments) : null
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

  if (!id) {
    return res.status(400).json({ error: 'Contact ID required' });
  }

  try {
    const updates: string[] = [];
    const args: any[] = [];

    // Build dynamic update query
    const allowedFields = [
      'type', 'name', 'company', 'title', 'phone', 'email', 
      'job', 'crew', 'shift', 'notes', 'job_assignments',
      'date_of_rotation'
    ];
    
    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (body[camelField] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'job_assignments' && typeof body[camelField] === 'object') {
          args.push(JSON.stringify(body[camelField]));
        } else {
          args.push(body[camelField]);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Always update timestamps
    updates.push('last_updated_date = date("now")', 'last_updated_time = time("now")');
    
    // Add the ID for WHERE clause
    args.push(id);

    const sql = `UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`;
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
    return res.status(400).json({ error: 'Contact ID required' });
  }

  try {
    await turso.execute({
      sql: 'DELETE FROM contacts WHERE id = ?',
      args: [id as string]
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    throw error;
  }
}

// Helper function to parse contact from database row
function parseContact(row: any) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    company: row.company,
    title: row.title,
    phone: row.phone,
    email: row.email,
    job: row.job,
    crew: row.crew,
    shift: row.shift,
    notes: row.notes,
    jobAssignments: row.job_assignments ? JSON.parse(row.job_assignments as string) : [],
    createdDate: row.created_date,
    lastUpdatedDate: row.last_updated_date,
    lastUpdatedTime: row.last_updated_time,
    dateOfRotation: row.date_of_rotation
  };
}