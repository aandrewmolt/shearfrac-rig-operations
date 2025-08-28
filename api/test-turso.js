export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Check environment variables
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
  
  const status = {
    hasUrl: !!TURSO_URL,
    hasToken: !!TURSO_TOKEN,
    urlLength: TURSO_URL ? TURSO_URL.length : 0,
    tokenLength: TURSO_TOKEN ? TURSO_TOKEN.length : 0,
    urlPrefix: TURSO_URL ? TURSO_URL.substring(0, 20) + '...' : 'not set',
    timestamp: new Date().toISOString()
  };

  // Try to import and create client
  try {
    if (!TURSO_URL || !TURSO_TOKEN) {
      return res.status(200).json({
        success: false,
        message: 'Missing credentials',
        status
      });
    }

    const { createClient } = await import('@libsql/client/web');
    
    const turso = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });

    // Try a simple query
    const result = await turso.execute('SELECT 1 as test');
    
    return res.status(200).json({
      success: true,
      message: 'Turso connection successful',
      status,
      testQuery: result.rows[0]
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      message: 'Connection failed',
      error: error.message,
      stack: error.stack ? error.stack.split('\n').slice(0, 5) : undefined,
      status
    });
  }
}