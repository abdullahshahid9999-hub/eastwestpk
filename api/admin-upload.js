// /api/admin-upload.js
// Lets the admin panel upload images (airline logos, package photos, etc.)
// straight to Supabase Storage instead of admin having to hunt down an
// image URL online and paste it. Same auth model as admin-data.js: caller
// must present a real Supabase session belonging to an ADMIN_EMAILS
// address; the actual upload happens server-side with the service-role
// key so Storage RLS never needs to trust the browser.
//
// Required Vercel env vars (same ones used by admin-data.js):
//   SUPABASE_SERVICE_ROLE_KEY
//   ADMIN_EMAILS
//
// One-time setup required in Supabase (SQL editor):
//   insert into storage.buckets (id, name, public)
//   values ('uploads', 'uploads', true) on conflict (id) do nothing;

const SUPA_URL = 'https://bciqlmvheqlsmogpnmal.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXFsbXZoZXFsc21vZ3BubWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjY2NjYsImV4cCI6MjA4ODkwMjY2Nn0.NpwnG7NSx4YCcm--fT3-tcP_fSyoaXVgSxzHLRP9P3o';
const BUCKET = 'uploads';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB safety cap (client already compresses to well under this)
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server not configured — SUPABASE_SERVICE_ROLE_KEY missing.' });

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
  if (!allowList.length) return res.status(403).json({ error: 'Admin access is not configured (ADMIN_EMAILS missing).' });
  if (!allowList.includes((user.email || '').toLowerCase())) return res.status(403).json({ error: 'This account is not authorized as an admin.' });

  const { folder, fileName, fileBase64, contentType } = req.body || {};
  if (!fileBase64 || !fileName || !contentType) return res.status(400).json({ error: 'Missing file data.' });
  if (!ALLOWED_TYPES.has(contentType)) return res.status(400).json({ error: 'Unsupported file type. Use JPG, PNG, WEBP, or GIF.' });

  // folder must be a plain safe segment — no path traversal via ../ etc.
  const safeFolder = (folder || 'misc').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'misc';
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '').slice(-80) || 'file';
  const path = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  let buffer;
  try {
    buffer = Buffer.from(fileBase64, 'base64');
  } catch (e) {
    return res.status(400).json({ error: 'Invalid file data.' });
  }
  if (buffer.length > MAX_BYTES) return res.status(400).json({ error: 'File too large (max 5MB).' });

  try {
    const uploadRes = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'false'
      },
      body: buffer
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(errText);
    }
    const publicUrl = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    return res.status(200).json({ success: true, url: publicUrl });
  } catch (e) {
    console.error('Upload error:', e.message);
    return res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
}
