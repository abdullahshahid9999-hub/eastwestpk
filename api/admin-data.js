// Secure read/write path for admin-only access. Originally covered
// payment_slips/agent_bookings/agent_transactions only — expanded to also
// cover blogs, bookings, group_flights, packages, travellers,
// visa_services, and the insurance tables (ins_companies/ins_plans/
// ins_rates), which were previously written to DIRECTLY from the browser
// using the public anon key with no auth check at all. Since the anon key
// is visible in every page's source, that meant anyone could INSERT,
// UPDATE, or DELETE rows in those tables without ever logging in. Same
// model as before: verify the caller has a real, currently-valid Supabase
// session (and is on the admin allow-list), then perform the request
// using the secret service-role key, which bypasses RLS and is never
// exposed to the browser.
//
// Required Vercel env vars (same ones used by admin-agents.js):
//   SUPABASE_SERVICE_ROLE_KEY
//   ADMIN_EMAILS (optional but recommended)

const SUPA_URL = 'https://bciqlmvheqlsmogpnmal.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXFsbXZoZXFsc21vZ3BubWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjY2NjYsImV4cCI6MjA4ODkwMjY2Nn0.NpwnG7NSx4YCcm--fT3-tcP_fSyoaXVgSxzHLRP9P3o';

// Only these tables can be touched through this endpoint. Anything else
// is rejected outright, regardless of what the request body says.
const ALLOWED_TABLES = new Set([
  'payment_slips', 'agent_bookings', 'agent_transactions',
  'blogs', 'bookings', 'group_flights', 'packages', 'travellers', 'visa_services',
  'ins_companies', 'ins_plans', 'ins_rates'
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    return res.status(500).json({ error: 'Server not configured — SUPABASE_SERVICE_ROLE_KEY missing in Vercel env vars.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing session token.' });

  let user;
  try {
    const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Session is invalid or expired. Please log in again.' });
    user = await userRes.json();
  } catch (e) {
    return res.status(401).json({ error: 'Could not verify session.' });
  }

  const allowList = (process.env.ADMIN_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!allowList.length) {
    return res.status(403).json({ error: 'Admin access is not configured (ADMIN_EMAILS missing in Vercel env vars).' });
  }
  if (!allowList.includes((user.email || '').toLowerCase())) {
    return res.status(403).json({ error: 'This account is not authorized as an admin.' });
  }

  const { table, action, id, data, query } = req.body || {};
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: 'Table not allowed.' });
  }

  const H = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  try {
    let result;

    if (action === 'list') {
      const qs = query || 'order=created_at.desc';
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, { headers: H });
      result = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(result));

    } else if (action === 'create') {
      if (!data) return res.status(400).json({ error: 'Missing data.' });
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, { method: 'POST', headers: H, body: JSON.stringify(data) });
      result = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(result));
      result = Array.isArray(result) ? result[0] : result;

    } else if (action === 'update') {
      if (!id || !data) return res.status(400).json({ error: 'Missing id or data.' });
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, { method: 'PATCH', headers: H, body: JSON.stringify(data) });
      result = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(result));
      result = Array.isArray(result) ? result[0] : result;

    } else if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing id.' });
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE', headers: H });
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
