-- ═══════════════════════════════════════════════════════
--  EASTWESTPK — Migration 2: Booking Expiry & Issue Workflow
--  Run this in Supabase → SQL Editor → New Query → Run
--  (Run AFTER agent-schema.sql has already been run once)
-- ═══════════════════════════════════════════════════════

-- Extend agent_bookings: expiry tracking + issue-request workflow
alter table agent_bookings
  add column if not exists source            text default 'internal' check (source in ('internal','supplier_api')),
  add column if not exists expires_at         timestamptz,
  add column if not exists issue_requested_at timestamptz,
  add column if not exists issue_requested_by text,                 -- 'agent' or 'admin'
  add column if not exists supplier_ref       text,                  -- ref returned by supplier API once issued
  add column if not exists supplier_status    text,                  -- raw status string from supplier API
  add column if not exists alert_count        int default 0,         -- how many times admin has been alerted
  add column if not exists last_alert_at      timestamptz;

-- Update status check constraint to include new states
alter table agent_bookings drop constraint if exists agent_bookings_status_check;
alter table agent_bookings add constraint agent_bookings_status_check
  check (status in ('pending','confirmed','issue_requested','issued','cancelled','expired'));

-- Track seat/slot inventory release on expiry — flights already have booked_seats,
-- this just lets us know which booking caused which seat deduction (for safe rollback)
alter table agent_bookings
  add column if not exists seats_reserved int default 0;

-- Index for the expiry sweep (cron / interval check)
create index if not exists idx_agent_bookings_expiry
  on agent_bookings(expires_at)
  where status in ('pending','confirmed','issue_requested');

-- Index for admin alert polling
create index if not exists idx_agent_bookings_issue_requested
  on agent_bookings(status, issue_requested_at)
  where status = 'issue_requested';

-- ─── RLS: allow agents to request issuance on their own bookings ───
-- The original schema only let agents INSERT and SELECT bookings.
-- The issue-request flow needs agents to flip status -> 'issue_requested'
-- on their own pending/confirmed bookings (and nothing else / no one else's).
drop policy if exists "Agent requests issue on own booking" on agent_bookings;
create policy "Agent requests issue on own booking"
  on agent_bookings for update
  using (
    agent_id = (select id from agents where supabase_uid = auth.uid())
    and status in ('pending','confirmed')
  )
  with check (
    agent_id = (select id from agents where supabase_uid = auth.uid())
    and status = 'issue_requested'
  );

-- ─── RLS: allow agents to reserve/release seats is handled server-side
-- via the anon key today (group_flights has no agent-specific RLS yet).
-- group_flights already has no RLS enabled in the original schema, so
-- no additional policy is needed here unless RLS gets enabled later.

-- ─── IMPORTANT DESIGN NOTE ───
-- The `agents` table intentionally has NO agent-facing UPDATE policy
-- (see agent-schema.sql — only a SELECT policy exists for agents on
-- their own row). This is by design: an agent's balance/credit_limit
-- must NEVER be writable by the agent themselves, from any client code.
-- Balance is only ever debited by admin, and only at the moment a
-- booking is actually ISSUED (not when the agent first submits it).
-- Do not add an agent UPDATE policy on `agents` in future migrations.

