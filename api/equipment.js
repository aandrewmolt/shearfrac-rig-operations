// Simple equipment sync endpoint without TypeScript
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // For now, return mock data to test the endpoint
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Equipment sync endpoint is working'
      });
    }

    if (req.method === 'POST') {
      return res.status(200).json({
        success: true,
        message: 'Equipment created (mock)',
        data: req.body
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Equipment API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}