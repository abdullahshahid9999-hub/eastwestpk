// /api/send-otp.js
// Vercel Serverless Function — sends OTP codes via Resend
// Requires RESEND_API_KEY environment variable set in Vercel dashboard

export default async function handler(req, res) {
  // CORS — allow requests from the site itself
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, purpose, agentName } = req.body || {};

  if (!email || !otp) {
    return res.status(400).json({ error: 'email and otp are required' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const purposeText = purpose === 'password_reset'
    ? 'Password Reset Request'
    : 'Booking Confirmation';

  const greeting = agentName ? `Hi ${agentName},` : 'Hello,';

  const html = `
  <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:480px;margin:0 auto;background:#FAFAF7;padding:32px 24px;border-radius:12px;border:1px solid #E4DFD4">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:18px;font-weight:800;color:#14142B;letter-spacing:-0.02em">East &amp; <span style="color:#D4A843">West</span> Travel</div>
      <div style="font-size:11px;color:#7A7A95;margin-top:4px;text-transform:uppercase;letter-spacing:0.08em">Agent Portal</div>
    </div>
    <p style="font-size:14px;color:#3D3D5C;margin-bottom:4px">${greeting}</p>
    <p style="font-size:13px;color:#7A7A95;margin-bottom:24px">${purposeText} — use the code below to continue. This code expires in 10 minutes.</p>
    <div style="background:#FFFFFF;border:2px solid #D4A843;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px">
      <div style="font-size:32px;font-weight:800;letter-spacing:0.2em;color:#071120">${otp}</div>
    </div>
    <p style="font-size:11px;color:#B0AFBF;text-align:center">If you did not request this code, please ignore this email or contact East &amp; West Travel directly.</p>
    <hr style="border:none;border-top:1px solid #E4DFD4;margin:20px 0">
    <p style="font-size:10px;color:#B0AFBF;text-align:center">East &amp; West Travel Services · G-07, Chaudhry Arcade, New Civil Lines, Faisalabad<br>+92 333 651 5349 · eastwestpk@hotmail.com</p>
  </div>`;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'East & West Travel <onboarding@resend.dev>',
        to: [email],
        subject: `Your OTP Code — ${otp}`,
        html
      })
    });

    const data = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Resend error:', data);
      return res.status(502).json({ error: 'Failed to send email', details: data });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ error: 'Internal error sending email' });
  }
}
