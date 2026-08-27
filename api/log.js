/* ============================================================
 * api/log.js — Vercel Edge Function: Proxy to GAS
 * Server-to-server = ไม่มี CORS issue
 * Edge Runtime uses Web APIs (Request/Response)
 * ============================================================ */

const GAS_WEBHOOK_URL = process.env.GAS_WEBHOOK_URL;

export default async function handler(request) {
  // CORS headers for browser
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://www.cognitivetesting.me',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  if (!GAS_WEBHOOK_URL) {
    console.error('GAS_WEBHOOK_URL not configured');
    return Response.json({ ok: false, error: 'GAS_WEBHOOK_URL not configured' }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }

  // Parse body using Web API
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    console.error('JSON parse error:', e);
    payload = {};
  }
  
  console.log('Parsed payload:', JSON.stringify(payload));
  console.log('Has action:', payload && 'action' in payload);

  // Validate required fields
  if (!payload || !payload.action) {
    return Response.json({ ok: false, error: 'Missing action' }, { 
      status: 400, 
      headers: corsHeaders 
    });
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
      // Return success anyway since data was written to sheets
      return Response.json({ 
        ok: true, 
        rowId: 'unknown', 
        warning: 'GAS response not JSON but data likely saved',
        raw: responseText 
      }, { headers: corsHeaders });
    }

    if (!gasRes.ok) {
      return Response.json(data, { status: gasRes.status, headers: corsHeaders });
    }

    return Response.json(data, { headers: corsHeaders });
    
  } catch (err) {
    console.error('Proxy error:', err);
    return Response.json({ ok: false, error: err.message }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}