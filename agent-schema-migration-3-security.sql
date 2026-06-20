-- ═══════════════════════════════════════════════════════════════
-- SECURITY FIX — agents table
-- Run this in Supabase SQL Editor.
--
-- BEFORE RUNNING THIS:
--   1. The new code (api/admin-agents.js + admin/dashboard.html changes)
--      must already be pushed and live on Vercel.
--   2. SUPABASE_SERVICE_ROLE_KEY must already be set in Vercel env vars
--      (Supabase → Settings → API → service_role key — SECRET, never
--      put this anywhere in the website code, only in Vercel env vars).
--   3. Test admin login + editing an agent's balance AFTER this runs,
--      before walking away.
-- ═══════════════════════════════════════════════════════════════

-- 1. Turn Row Level Security ON. Right now it's OFF, which means anyone
--    with the public site key can read or write any agent's balance,
--    credit limit, or tier directly, no login required. This is the
--    actual fix — everything else here builds on top of it.
alter table agents enable row level security;

-- 2. Agents can read their own profile only (their own balance, tier, etc).
--    This already existed but was never enforced because RLS was off.
--    Recreated here so it's explicit and correct.
drop policy if exists "Agent reads own profile" on agents;
create policy "Agent reads own profile" on agents
  for select
  to authenticated
  using (supabase_uid = auth.uid());

-- 3. Agents can update ONLY their own row, and ONLY non-financial branding
--    fields (company name, address, phone, logo). Balance, credit_limit,
--    tier, status, commission rates are NOT in this grant, so even a
--    direct API call from an agent's own real session cannot touch them —
--    Postgres rejects the write at the column level, before RLS is even
--    evaluated. Those fields can only be changed via the admin server
--    function (api/admin-agents.js), which uses the secret service key.
drop policy if exists "Agent updates own branding" on agents;
create policy "Agent updates own branding" on agents
  for update
  to authenticated
  using (supabase_uid = auth.uid())
  with check (supabase_uid = auth.uid());

revoke update on agents from authenticated;
grant update (company_name, address, phone, logo_url) on agents to authenticated;

-- 4. No agent (or anyone logged in) can create or delete agent rows directly.
--    Only admin, through the secure server function, can do this.
revoke insert, delete on agents from authenticated;

-- 5. The public (anonymous, not-logged-in) role gets ZERO access of any kind.
--    This is the line that stops a random visitor from touching this table
--    using the key sitting in your page source.
revoke all on agents from anon;

-- 6. Add the logo_url column if it doesn't exist yet (needed for step 3 above).
alter table agents add column if not exists logo_url text;
