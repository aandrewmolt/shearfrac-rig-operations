import { createClient } from '@libsql/client/web';

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

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN,
    });

    const result = await client.execute('SELECT 1 as test');

    res.status(200).json({
      success: true,
      message: 'Turso connection successful',
      result: result.rows
    });
  } catch (error) {
    console.error('Turso test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
