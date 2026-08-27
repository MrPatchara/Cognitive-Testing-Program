/* ============================================================
 * api/log.js — Vercel Serverless Function: Proxy to GAS
 * Server-to-server = ไม่มี CORS issue
 * Runtime: Node.js (auto-detected)
 * Relies on Vercel Node runtime auto-parsed req.body
 * ============================================================ */

const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.cognitivetesting.me');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!GAS_WEBHOOK_URL) {
    return res.status(500).json({ ok: false, error: 'GAS_WEBHOOK_URL not configured' });
  }

  let payload = req.body;
  console.log('typeof req.body:', typeof payload);
  console.log('req.body:', JSON.stringify(payload));
  console.log('body keys:', payload && typeof payload === 'object' ? Object.keys(payload) : 'n/a');
  console.log('has action:', payload && 'action' in payload);

  if (!payload || typeof payload !== 'object' || !payload.action) {
    return res.status(400).json({ ok: false, error: 'Missing action', bodyType: typeof payload, body: payload });
  }

  try {
    const gasRes = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseText = await gasRes.text();
    console.log('GAS status:', gasRes.status);
    console.log('GAS text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return res.status(200).json({ ok: true, rowId: 'unknown', warning: 'GAS not JSON', raw: responseText });
    }

    return res.status(gasRes.ok ? 200 : gasRes.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};