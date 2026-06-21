// Secure write path for the `agents` table — balances, credit limits, tiers,
// agent create/delete. The agents table itself has NO direct write access
// for any client-side key (anon or authenticated) for these fields — every
// privileged write must come through here, using the secret service-role
// key, which only exists on the server and is never shipped to the browser.
//
// Required Vercel env vars:
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase → Settings → API → service_role key (SECRET)
//   ADMIN_EMAILS               — comma-separated list of admin login emails allowed
//                                 to use this endpoint, e.g. "owner@eastwestpk.com"
//                                 (leave unset to allow any valid logged-in Supabase user —
//                                 only do this temporarily while you only have one admin)

const SUPA_URL = 'https://bciqlmvheqlsmogpnmal.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXFsbXZoZXFsc21vZ3BubWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjY2NjYsImV4cCI6MjA4ODkwMjY2Nn0.NpwnG7NSx4YCcm--fT3-tcP_fSyoaXVgSxzHLRP9P3o';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'Server not configured — SUPABASE_SERVICE_ROLE_KEY missing in Vercel env vars.' });
  }

  // 1. Caller must present the real Supabase session token issued at admin login
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing session token.' });
  }

  // 2. Verify that token is a real, currently-valid Supabase session
  let user;
  try {
    const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: 'Session is invalid or expired. Please log in again.' });
    }
    user = await userRes.json();
  } catch (e) {
    return res.status(401).json({ error: 'Could not verify session.' });
  }

  // 3. Optional allow-list check (recommended once you add ADMIN_EMAILS)
  const allowList = (process.env.ADMIN_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allowList.length) {
    return res.status(403).json({ error: 'Admin access is not configured (ADMIN_EMAILS missing in Vercel env vars).' });
  }
  if (!allowList.includes((user.email || '').toLowerCase())) {
    return res.status(403).json({ error: 'This account is not authorized as an admin.' });
  }

  // 4. Perform the requested write using the service-role key (bypasses RLS — server only)
  const { action, id, data } = req.body || {};
  const H = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  try {
    let result;

    if (action === 'list') {
      const r = await fetch(`${SUPA_URL}/rest/v1/agents?order=created_at.desc`, { headers: H });
      result = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(result));

    } else if (action === 'create') {
      if (!data) return res.status(400).json({ error: 'Missing data.' });
      const r = await fetch(`${SUPA_URL}/rest/v1/agents`, { method: 'POST', headers: H, body: JSON.stringify(data) });
      result = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(result));
      result = Array.isArray(result) ? result[0] : result;

    } else if (action === 'update') {
      if (!id || !data) return res.status(400).json({ error: 'Missing id or data.' });
      const r = await fetch(`${SUPA_URL}/rest/v1/agents?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify(data) });
      result = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(result));
      result = Array.isArray(result) ? result[0] : result;

    } else if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing id.' });
      const r = await fetch(`${SUPA_URL}/rest/v1/agents?id=eq.${id}`, { method: 'DELETE', headers: H });
      if (!r.ok) { const e = await r.json(); throw new Error(JSON.stringify(e)); }
      result = { success: true };

    } else {
      return res.status(400).json({ error: 'Unknown action.' });
    }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
