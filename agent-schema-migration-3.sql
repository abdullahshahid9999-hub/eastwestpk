-- ═══════════════════════════════════════════════════════
--  EASTWESTPK — Migration 3: Fix Admin Access to Payment Slips
--  Run this in Supabase → SQL Editor → New Query → Run
--  (Run AFTER agent-schema.sql and agent-schema-migration-2.sql)
-- ═══════════════════════════════════════════════════════
--
-- ROOT CAUSE: payment_slips never had a policy allowing the admin
-- panel (which talks to Supabase using the plain anon key, NOT a
-- logged-in agent's auth.uid()) to SELECT or UPDATE rows. The only
-- existing policies were scoped to "agent_id = the logged-in agent's
-- own id" — which is correctly true for the agent dashboard, but the
-- admin dashboard has no Supabase Auth session at all, so auth.uid()
-- is null for it and every row was silently filtered out by RLS
-- (no error — admin's GET just always returned an empty array).
--
-- This migration adds explicit admin-style policies so the admin
-- panel can see and approve/reject every agent's submitted slips.

-- Allow reading all payment slips (needed by admin/dashboard.html)
drop policy if exists "Admin reads all slips" on payment_slips;
create policy "Admin reads all slips"
  on payment_slips for select
  using (true);

-- Allow updating status/admin_notes/reviewed_at on any slip
-- (needed by approveSlip()/rejectSlip() in admin/dashboard.html)
drop policy if exists "Admin updates slips" on payment_slips;
create policy "Admin updates slips"
  on payment_slips for update
  using (true);

-- ─── Apply the same fix to agents, agent_bookings, and agent_transactions ───
-- These tables appeared to work in the admin panel already, but they
-- never had an explicit anon-read policy either in the committed schema.
-- If they are working for you right now, a broader policy was likely
-- added directly in the Supabase dashboard outside of these SQL files —
-- in that case these statements are harmless no-ops (drop + recreate
-- the same effective policy). If anything in admin ever silently shows
-- empty/stale data again, this is almost certainly why.

drop policy if exists "Admin reads all agents" on agents;
create policy "Admin reads all agents"
  on agents for select
  using (true);

drop policy if exists "Admin updates agents" on agents;
create policy "Admin updates agents"
  on agents for update
  using (true);

drop policy if exists "Admin inserts agents" on agents;
create policy "Admin inserts agents"
  on agents for insert
  with check (true);

drop policy if exists "Admin deletes agents" on agents;
create policy "Admin deletes agents"
  on agents for delete
  using (true);

drop policy if exists "Admin reads all agent_bookings" on agent_bookings;
create policy "Admin reads all agent_bookings"
  on agent_bookings for select
  using (true);

drop policy if exists "Admin updates agent_bookings" on agent_bookings;
create policy "Admin updates agent_bookings"
  on agent_bookings for update
  using (true);

drop policy if exists "Admin reads all agent_transactions" on agent_transactions;
create policy "Admin reads all agent_transactions"
  on agent_transactions for select
  using (true);

drop policy if exists "Admin inserts agent_transactions" on agent_transactions;
create policy "Admin inserts agent_transactions"
  on agent_transactions for insert
  with check (true);
