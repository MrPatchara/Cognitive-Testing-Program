export default async function handler(request) {
  const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });
  if (request.method !== 'POST') return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405, headers: cors });

  if (!GAS_WEBHOOK_URL) return Response.json({ ok: false, error: 'GAS_WEBHOOK_URL not set' }, { status: 500, headers: cors });

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return Response.json({ ok: false, error: 'Bad JSON body', msg: e.message }, { status: 400, headers: cors });
  }

  if (!data || !data.action) {
    return Response.json({ ok: false, error: 'Missing action', data }, { status: 400, headers: cors });
  }

  try {
    const r = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch (e) { json = { ok: true, raw: text }; }
    return Response.json(json, { status: r.ok ? 200 : r.status, headers: cors });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500, headers: cors });
  }
}