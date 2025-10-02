import { createClient } from '@libsql/client/web';

let tursoClient = null;

function getTursoClient() {
  if (!tursoClient) {
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN,
    });
  }
  return tursoClient;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { operation, sql, params, statements } = req.body;
    const client = getTursoClient();

    let result;

    switch (operation) {
      case 'execute':
        result = await client.execute(sql, params);
        break;

      case 'batch':
        result = await client.batch(statements);
        break;

      default:
        res.status(400).json({ error: 'Invalid operation' });
        return;
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Database proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
