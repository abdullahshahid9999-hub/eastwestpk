// Verifies that a freshly-logged-in Supabase user is actually allowed to be
// an admin, before the login page lets them into the dashboard. Without
// this check, ANY valid Supabase login — including an agent's own account —
// passes the admin login screen, since Supabase Auth itself doesn't know
// the difference between an admin and an agent. This is the gatekeeper.

const SUPA_URL = 'https://bciqlmvheqlsmogpnmal.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXFsbXZoZXFsc21vZ3BubWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjY2NjYsImV4cCI6MjA4ODkwMjY2Nn0.NpwnG7NSx4YCcm--fT3-tcP_fSyoaXVgSxzHLRP9P3o';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ isAdmin: false, error: 'Missing session token.' });

  let user;
  try {
    const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!userRes.ok) return res.status(401).json({ isAdmin: false, error: 'Invalid session.' });
    user = await userRes.json();
  } catch (e) {
    return res.status(401).json({ isAdmin: false, error: 'Could not verify session.' });
  }

  const allowList = (process.env.ADMIN_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  if (!allowList.length) {
    // No allow-list configured at all — fail CLOSED, not open. Without a
    // configured list there is no way to distinguish admin from agent, so
    // nobody is let in until ADMIN_EMAILS is set in Vercel.
    return res.status(403).json({ isAdmin: false, error: 'Admin access is not configured (ADMIN_EMAILS missing).' });
  }

  const isAdmin = allowList.includes((user.email || '').toLowerCase());
  return res.status(200).json({ isAdmin, email: user.email });
}
