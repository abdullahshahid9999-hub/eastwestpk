// /api/agent-otp.js
// Secure, server-side OTP issuing & verification for the agent portal.
//
// WHY THIS EXISTS: the old flow generated the OTP in browser JS
// (Math.random), wrote it straight into the `agent_otps` table with the
// anon key, and verified it by re-reading that same table from the
// browser. That means the "secret" code never left client-controlled
// territory — anyone with devtools could read/forge it, or hit
// /api/send-otp directly to blast arbitrary emails "from" East & West.
//
// This endpoint moves generation, storage, and verification entirely
// server-side using the service-role key. The `agent_otps` table should
// have ALL client (anon/authenticated) policies dropped — see the RLS
// migration notes at the bottom of this file. Only this function may
// read/write it from now on.
//
// Required Vercel env vars:
//   SUPABASE_SERVICE_ROLE_KEY  (already used by admin-agents.js / admin-data.js)
//   RESEND_API_KEY             (already used by the old send-otp.js)

import crypto from 'crypto';

const SUPA_URL = 'https://bciqlmvheqlsmogpnmal.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjaXFsbXZoZXFsc21vZ3BubWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMjY2NjYsImV4cCI6MjA4ODkwMjY2Nn0.NpwnG7NSx4YCcm--fT3-tcP_fSyoaXVgSxzHLRP9P3o';

const MAX_ATTEMPTS = 5;          // failed verify attempts before an OTP is burned
const MAX_REQUESTS_PER_WINDOW = 3; // how many OTPs can be requested
const WINDOW_MINUTES = 10;         // ...within this many minutes
const OTP_TTL_MINUTES = 10;

function genOtp() {
  // crypto.randomInt is CSPRNG-backed, unlike Math.random.
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

async function sbFetch(path, opts, key) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {})
    }
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d && d.message ? d.message : `Supabase error (${r.status})`);
  return d;
}

async function getAuthedAgent(req, SERVICE_KEY) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  const rows = await sbFetch(
    `agents?supabase_uid=eq.${user.id}&select=id,email,full_name,status`,
    { method: 'GET' },
    SERVICE_KEY
  );
  return rows && rows[0] ? rows[0] : null;
}

async function sendOtpMail(apiKey, email, otp, purpose, agentName) {
  const purposeText = purpose === 'password_reset' ? 'Password Reset Request' : 'Issue Request Confirmation';
  const greeting = agentName ? `Hi ${agentName},` : 'Hello,';
  const html = `
  <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:480px;margin:0 auto;background:#FAFAF7;padding:32px 24px;border-radius:12px;border:1px solid #E4DFD4">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:18px;font-weight:800;color:#14142B;letter-spacing:-0.02em">East &amp; <span style="color:#D4A843">West</span> Travel</div>
      <div style="font-size:11px;color:#7A7A95;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em">Agent Portal</div>
    </div>
    <p style="font-size:14px;color:#3D3D5C;margin-bottom:4px">${greeting}</p>
    <p style="font-size:13px;color:#7A7A95;margin-bottom:24px">${purposeText} — use the code below to continue. This code expires in ${OTP_TTL_MINUTES} minutes.</p>
    <div style="background:#FFFFFF;border:2px solid #D4A843;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
      <div style="font-size:32px;font-weight:800;letter-spacing:0.2em;color:#071120">${otp}</div>
    </div>
    <p style="font-size:11px;color:#B0AFBF;text-align:center">If you did not request this code, please ignore this email or contact East &amp; West Travel directly.</p>
    <hr style="border:none;border-top:1px solid #E4DFD4;margin:20px 0">
    <p style="font-size:10px;color:#B0AFBF;text-align:center">East &amp; West Travel Services · G-07, Chaudhry Arcade, New Civil Lines, Faisalabad<br>+92 333 651 5349 · eastwestpk@hotmail.com</p>
  </div>`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'East & West Travel <otp@eastwestpk.com>',
      to: [email],
      subject: `Your OTP Code — ${otp}`,
      html
    })
  });
  if (!resendRes.ok) {
    const d = await resendRes.json().catch(() => ({}));
    throw new Error('Failed to send email: ' + JSON.stringify(d));
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://eastwestpk.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!SERVICE_KEY) return res.status(500).json({ error: 'Server not configured — SUPABASE_SERVICE_ROLE_KEY missing.' });
  if (!RESEND_KEY) return res.status(500).json({ error: 'Server not configured — RESEND_API_KEY missing.' });

  const { action } = req.body || {};

  try {
    // ── Logged-in agent requesting an OTP to confirm an issue request ──
    if (action === 'request-issue-otp') {
      const agent = await getAuthedAgent(req, SERVICE_KEY);
      if (!agent) return res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });
      if (agent.status !== 'active') return res.status(403).json({ error: 'Account is not active.' });

      const since = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString();
      const recent = await sbFetch(
        `agent_otps?agent_id=eq.${agent.id}&purpose=eq.issue_request&created_at=gte.${since}&select=id`,
        { method: 'GET' }, SERVICE_KEY
      );
      if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({ error: 'Too many OTP requests. Please wait a few minutes and try again.' });
      }

      const otp = genOtp();
      const exp = new Date(Date.now() + OTP_TTL_MINUTES * 60000).toISOString();
      const created = await sbFetch('agent_otps', {
        method: 'POST',
        body: JSON.stringify({ agent_id: agent.id, otp_code: otp, purpose: 'issue_request', expires_at: exp, attempts: 0 })
      }, SERVICE_KEY);

      await sendOtpMail(RESEND_KEY, agent.email, otp, 'issue_request', agent.full_name);
      return res.status(200).json({ success: true, otpId: created[0].id });
    }

    // ── Logged-in agent verifying the OTP they were emailed ──
    if (action === 'verify-issue-otp') {
      const agent = await getAuthedAgent(req, SERVICE_KEY);
      if (!agent) return res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });

      const { otpId, code } = req.body || {};
      if (!otpId || !code) return res.status(400).json({ error: 'Missing OTP code.' });

      const rows = await sbFetch(`agent_otps?id=eq.${otpId}&agent_id=eq.${agent.id}&used=eq.false&select=*`, { method: 'GET' }, SERVICE_KEY);
      if (!rows.length) return res.status(400).json({ valid: false, error: 'OTP not found or already used.' });
      const row = rows[0];

      if (new Date(row.expires_at) < new Date()) return res.status(400).json({ valid: false, error: 'OTP expired.' });
      if (row.attempts >= MAX_ATTEMPTS) return res.status(429).json({ valid: false, error: 'Too many incorrect attempts. Request a new OTP.' });

      if (row.otp_code !== code) {
        await sbFetch(`agent_otps?id=eq.${otpId}`, { method: 'PATCH', body: JSON.stringify({ attempts: row.attempts + 1 }) }, SERVICE_KEY);
        return res.status(400).json({ valid: false, error: 'Incorrect OTP.' });
      }

      await sbFetch(`agent_otps?id=eq.${otpId}`, { method: 'PATCH', body: JSON.stringify({ used: true }) }, SERVICE_KEY);
      return res.status(200).json({ valid: true, agentId: agent.id });
    }

    // ── Pre-login password reset: step 1, identity check + send OTP ──
    if (action === 'request-reset-otp') {
      const { agentCode, email, phone } = req.body || {};
      if (!agentCode || !email || !phone) return res.status(400).json({ error: 'All fields required.' });

      const rows = await sbFetch(
        `agents?agent_code=eq.${encodeURIComponent(agentCode)}&email=eq.${encodeURIComponent(email)}&select=id,phone,full_name,email,status`,
        { method: 'GET' }, SERVICE_KEY
      );
      // Generic message either way — don't reveal whether the agent code/email exists.
      const genericErr = { error: 'No matching agent found. Check your details.' };
      if (!rows.length) return res.status(400).json(genericErr);
      const agent = rows[0];
      const clean = (p) => (p || '').replace(/\D/g, '');
      if (clean(agent.phone) !== clean(phone)) return res.status(400).json(genericErr);
      if (agent.status !== 'active') return res.status(403).json({ error: 'Account is not active. Contact East & West.' });

      const since = new Date(Date.now() - WINDOW_MINUTES * 60000).toISOString();
      const recent = await sbFetch(
        `agent_otps?agent_id=eq.${agent.id}&purpose=eq.password_reset&created_at=gte.${since}&select=id`,
        { method: 'GET' }, SERVICE_KEY
      );
      if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({ error: 'Too many reset requests. Please wait a few minutes and try again.' });
      }

      const otp = genOtp();
      const exp = new Date(Date.now() + OTP_TTL_MINUTES * 60000).toISOString();
      await sbFetch('agent_otps', {
        method: 'POST',
        body: JSON.stringify({ agent_id: agent.id, otp_code: otp, purpose: 'password_reset', expires_at: exp, attempts: 0 })
      }, SERVICE_KEY);

      await sendOtpMail(RESEND_KEY, agent.email, otp, 'password_reset', null);
      return res.status(200).json({ success: true, maskedEmail: agent.email.replace(/(.{2}).+(@.+)/, '$1***$2') });
    }

    // ── Pre-login password reset: step 2, verify OTP ──
    if (action === 'verify-reset-otp') {
      const { agentCode, email, code } = req.body || {};
      if (!agentCode || !email || !code) return res.status(400).json({ error: 'Missing fields.' });

      const agentRows = await sbFetch(
        `agents?agent_code=eq.${encodeURIComponent(agentCode)}&email=eq.${encodeURIComponent(email)}&select=id`,
        { method: 'GET' }, SERVICE_KEY
      );
      if (!agentRows.length) return res.status(400).json({ valid: false, error: 'Invalid OTP.' });
      const agentId = agentRows[0].id;

      const rows = await sbFetch(
        `agent_otps?agent_id=eq.${agentId}&purpose=eq.password_reset&used=eq.false&order=created_at.desc&limit=1&select=*`,
        { method: 'GET' }, SERVICE_KEY
      );
      if (!rows.length) return res.status(400).json({ valid: false, error: 'Invalid OTP.' });
      const row = rows[0];

      if (new Date(row.expires_at) < new Date()) return res.status(400).json({ valid: false, error: 'OTP expired.' });
      if (row.attempts >= MAX_ATTEMPTS) return res.status(429).json({ valid: false, error: 'Too many incorrect attempts. Request a new OTP.' });

      if (row.otp_code !== code) {
        await sbFetch(`agent_otps?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ attempts: row.attempts + 1 }) }, SERVICE_KEY);
        return res.status(400).json({ valid: false, error: 'Incorrect OTP.' });
      }

      await sbFetch(`agent_otps?id=eq.${row.id}`, { method: 'PATCH', body: JSON.stringify({ used: true }) }, SERVICE_KEY);
      return res.status(200).json({ valid: true, agentId });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (e) {
    console.error('agent-otp error:', e);
    return res.status(500).json({ error: 'Internal error. Please try again.' });
  }
}
