const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.cognitivetesting.me');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Simple test: return body for ANY POST
  if (req.method === 'POST') {
    return res.status(200).json({ 
      ok: true, 
      gotBody: typeof req.body, 
      bodyKeys: req.body ? Object.keys(req.body) : [],
      hasAction: req.body && 'action' in req.body,
      contentType: req.headers['content-type']
    });
  }
  
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
};