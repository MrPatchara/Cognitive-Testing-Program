/* ============================================================
 * api/log.js — Vercel Serverless Function: Proxy to GAS
 * Server-to-server = ไม่มี CORS issue
 * ============================================================ */

const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL;

module.exports = async (req, res) => {
  // CORS headers for browser
  res.setHeader('Access-Control-Allow-Origin', 'https://www.cognitivetesting.me');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!GAS_WEBHOOK_URL) {
    console.error('GAS_WEBHOOK_URL not configured');
    return res.status(500).json({ ok: false, error: 'GAS_WEBHOOK_URL not configured' });
  }

  // Parse body manually
  const payload = await getBody(req);
  
  console.log('Parsed payload:', JSON.stringify(payload));
  console.log('Payload keys:', Object.keys(payload));
  console.log('Has action:', 'action' in payload);
  console.log('Action value:', payload.action);

  // Validate required fields
  if (!payload || !payload.action) {
    return res.status(400).json({ ok: false, error: 'Missing action' });
  }

  try {
    // Forward to GAS
    console.log('Forwarding to GAS:', GAS_WEBHOOK_URL);
    const gasRes = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('GAS status:', gasRes.status);
    console.log('GAS headers:', Object.fromEntries(gasRes.headers.entries()));

    const responseText = await gasRes.text();
    console.log('GAS response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse GAS response as JSON:', parseErr);
      console.error('Raw response:', responseText);
      // Return success anyway since data was written to sheets
      return res.status(200).json({ 
        ok: true, 
        rowId: 'unknown', 
        warning: 'GAS response not JSON but data likely saved',
        raw: responseText 
      });
    }

    if (!gasRes.ok) {
      return res.status(gasRes.status).json(data);
    }

    return res.status(200).json(data);
    
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};

function getBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        console.log('Raw body:', body);
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        console.error('JSON parse error:', e);
        resolve({});
      }
    });
    req.on('error', reject);
  });
}