-- ═══════════════════════════════════════════════════════
--  SECURITY HARDENING — agent_otps table
--  Run this in Supabase → SQL Editor → New Query → Run
--  (needed for /api/agent-otp.js to work correctly and safely)
-- ═══════════════════════════════════════════════════════

-- 1. Track failed verify attempts, so brute-forcing a 6-digit code
--    against the API gets locked out instead of retried forever.
alter table agent_otps add column if not exists attempts int default 0;

-- 2. Lock the table down completely from the browser. Previously the
--    anon key could read/write this table directly (that's how the old
--    insecure flow worked). Going forward, ONLY the service-role key
--    (used exclusively inside /api/agent-otp.js, never shipped to the
--    browser) may touch this table — RLS with zero policies means even
--    an authenticated agent's own token is blocked.
alter table agent_otps enable row level security;

-- Drop any pre-existing client-facing policies (names may differ from
-- your actual project — this covers the common defaults; Supabase
-- ignores DROP POLICY IF EXISTS for names that don't exist, so it's
-- safe to run even if some of these were never created).
drop policy if exists "Agents can insert own otps"       on agent_otps;
drop policy if exists "Agents can read own otps"          on agent_otps;
drop policy if exists "Agents can update own otps"        on agent_otps;
drop policy if exists "Enable insert for authenticated"   on agent_otps;
drop policy if exists "Enable select for authenticated"   on agent_otps;
drop policy if exists "Enable update for authenticated"   on agent_otps;
drop policy if exists "Public insert"                     on agent_otps;
drop policy if exists "Public select"                     on agent_otps;

-- No policies created = no anon/authenticated access at all. The
-- service-role key bypasses RLS entirely, so /api/agent-otp.js keeps
-- working normally.

-- 3. (Recommended) periodically clean out old rows — optional, but
--    keeps the table small. Safe to run manually any time:
-- delete from agent_otps where created_at < now() - interval '7 days';
