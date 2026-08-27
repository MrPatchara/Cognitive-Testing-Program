/* ============================================================
 * api/log.js — Vercel Serverless Function: Proxy to GAS
 * Server-to-server = ไม่มี CORS issue
 * Runtime: Node.js (auto-detected)
 * ============================================================ */

const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL;

function send(res, status, obj) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(obj);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

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
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  }

  // ---- DEBUG: inspect what Vercel gives us ----
  const dbg = {
    method: req.method,
    url: req.url,
    contentType: req.headers['content-type'] || null,
    contentLength: req.headers['content-length'] || null,
    transferEncoding: req.headers['transfer-encoding'] || null,
    hasBody: typeof req.body !== 'undefined',
    bodyType: req.body === null ? 'null' : typeof req.body,
    rawBodyPresent: typeof req.rawBody !== 'undefined',
    rawBodyLen: req.rawBody && req.rawBody.length,
  };
  console.log('DBG start:', JSON.stringify(dbg));
  if (dbg.hasBody) console.log('DBG req.body=', JSON.stringify(req.body));

  // ---- Attempt 1: req.body (may be auto-parsed) ----
  let payload = req.body;

  // ---- Attempt 2: req.rawBody (Vercel legacy) ----
  if (!payload && req.rawBody) {
    console.log('DBG rawBody:', String(req.rawBody));
    try {
      payload = JSON.parse(req.rawBody.toString());
    } catch (e) {
      console.error('DBG rawBody parse fail:', e.message);
    }
  }

  // ---- Attempt 3: event-based stream read ----
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    try {
      const raw = await readBody(req);
      console.log('DBG stream body len=', raw ? raw.length : 0);
      if (raw) console.log('DBG stream body=', raw.substring(0, 500));
      if (raw) payload = JSON.parse(raw);
    } catch (e) {
      console.error('DBG stream read error:', e.message);
    }
  }

  console.log('DBG FINAL payload keys=', payload ? Object.keys(payload) : 'none');

  // Validate required fields
  if (!payload || typeof payload !== 'object' || !payload.action) {
    return send(res, 400, { ok: false, error: 'Missing action' });
  }

  if (!GAS_WEBHOOK_URL) {
    console.error('GAS_WEBHOOK_URL not configured');
    return send(res, 500, { ok: false, error: 'GAS_WEBHOOK_URL not configured' });
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

    const responseText = await gasRes.text();
    console.log('GAS response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse GAS response as JSON:', parseErr);
      console.error('Raw response:', responseText);
      return send(res, 200, {
        ok: true,
        rowId: 'unknown',
        warning: 'GAS response not JSON but data likely saved',
        raw: responseText
      });
    }

    if (!gasRes.ok) {
      return send(res, gasRes.status, data);
    }

    return send(res, 200, data);

  } catch (err) {
    console.error('Proxy error:', err);
    return send(res, 500, { ok: false, error: err.message });
  }
};