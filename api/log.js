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
    return res.status(500).json({ ok: false, error: 'GAS_WEBHOOK_URL not configured' });
  }

  try {
    // Forward to GAS
    const gasRes = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await gasRes.json().catch(() => ({}));
    
    if (!gasRes.ok) {
      return res.status(gasRes.status).json(data);
    }

    return res.status(200).json(data);
    
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};