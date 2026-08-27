const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.cognitivetesting.me');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  if (!GAS_WEBHOOK_URL) return res.status(500).json({ ok: false, error: 'GAS_WEBHOOK_URL not set' });

  let payload = req.body;
  if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
    try {
      const raw = await readBody(req);
      if (raw) payload = JSON.parse(raw);
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'Bad JSON body' });
    }
  }

  if (!payload || !payload.action) {
    return res.status(400).json({ ok: false, error: 'Missing action' });
  }

  try {
    const r = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { ok: true, raw: text }; }
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};