const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.cognitivetesting.me');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // Debug: show env status
  console.log('GAS_WEBHOOK_URL set:', !!GAS_WEBHOOK_URL);
  console.log('GAS_WEBHOOK_URL value:', GAS_WEBHOOK_URL ? GAS_WEBHOOK_URL.substring(0, 50) + '...' : 'undefined');

  if (!GAS_WEBHOOK_URL) return res.status(500).json({ ok: false, error: 'GAS_WEBHOOK_URL not set' });

  const payload = req.body;

  if (!payload || !payload.action) {
    return res.status(400).json({ ok: false, error: 'Missing action', debug: { hasBody: !!payload, body: payload } });
  }

  try {
    console.log('Fetching GAS:', GAS_WEBHOOK_URL);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const r = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    console.log('GAS status:', r.status);
    const text = await r.text();
    console.log('GAS text:', text);
    
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { ok: true, raw: text }; }
    return res.status(200).json(data);
  } catch (e) {
    console.error('Proxy error:', e.name, e.message);
    return res.status(200).json({ ok: false, error: e.name + ': ' + e.message, hint: e.name === 'AbortError' ? 'GAS timeout (15s)' : 'network error' });
  }
};