-- ═══════════════════════════════════════════════════════
--  EASTWESTPK — Agent System SQL Schema
--  Run this in Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════

-- AGENTS table
create table if not exists agents (
  id                uuid default gen_random_uuid() primary key,
  agent_code        text unique not null,           -- e.g. EW-001, EW-002
  full_name         text not null,
  company_name      text,
  email             text unique not null,
  phone             text not null,
  city              text,
  address           text,
  tier              text default 'silver' check (tier in ('silver','gold','platinum')),
  credit_limit      numeric(12,2) default 0,        -- max credit allowed (0 = no credit)
  balance           numeric(12,2) default 0,        -- current balance (can be negative)
  commission_ticket numeric(5,2) default 0,         -- % commission on group tickets
  commission_umrah  numeric(5,2) default 0,         -- % commission on umrah
  commission_ins    numeric(5,2) default 0,         -- % commission on insurance
  status            text default 'active' check (status in ('active','suspended','inactive')),
  supabase_uid      uuid,                           -- linked Supabase Auth user id
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- AGENT OTPs table
create table if not exists agent_otps (
  id          uuid default gen_random_uuid() primary key,
  agent_id    uuid references agents(id) on delete cascade,
  otp_code    text not null,
  purpose     text not null,                        -- booking_confirm, password_reset
  expires_at  timestamptz not null,
  used        boolean default false,
  created_at  timestamptz default now()
);

-- AGENT BOOKINGS table
create table if not exists agent_bookings (
  id              uuid default gen_random_uuid() primary key,
  booking_ref     text unique not null,             -- e.g. AB-20240619-001
  agent_id        uuid references agents(id),
  service_type    text not null check (service_type in ('group_ticket','umrah','insurance')),
  service_id      uuid,                             -- ref to group_flights or packages
  service_name    text,                             -- human readable
  passengers      jsonb,                            -- array of passenger objects
  cost_price      numeric(12,2) default 0,          -- what EW pays supplier
  sell_price      numeric(12,2) default 0,          -- what agent pays EW
  commission_amt  numeric(12,2) default 0,          -- agent commission earned
  pax_count       int default 1,
  travel_date     date,
  status          text default 'pending' check (status in ('pending','confirmed','cancelled','issued')),
  otp_verified    boolean default false,
  admin_notes     text,
  agent_notes     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- AGENT TRANSACTIONS table (ledger)
create table if not exists agent_transactions (
  id          uuid default gen_random_uuid() primary key,
  agent_id    uuid references agents(id) on delete cascade,
  type        text not null check (type in ('debit','credit','commission','adjustment')),
  amount      numeric(12,2) not null,
  balance_after numeric(12,2) not null,
  description text,
  booking_id  uuid references agent_bookings(id),
  created_by  text default 'system',               -- 'system', 'admin', 'agent'
  created_at  timestamptz default now()
);

-- PAYMENT SLIPS table
create table if not exists payment_slips (
  id           uuid default gen_random_uuid() primary key,
  agent_id     uuid references agents(id) on delete cascade,
  amount       numeric(12,2) not null,
  bank_name    text,
  slip_image   text,                               -- base64 or URL
  reference_no text,
  status       text default 'pending' check (status in ('pending','approved','rejected')),
  admin_notes  text,
  created_at   timestamptz default now(),
  reviewed_at  timestamptz
);

-- COMMISSION RULES table (per tier per service)
create table if not exists commission_rules (
  id           uuid default gen_random_uuid() primary key,
  tier         text not null check (tier in ('silver','gold','platinum')),
  service_type text not null check (service_type in ('group_ticket','umrah','insurance')),
  commission   numeric(5,2) default 0,
  credit_limit numeric(12,2) default 0,
  unique(tier, service_type)
);

-- Seed default commission rules
insert into commission_rules (tier, service_type, commission, credit_limit) values
  ('silver',   'group_ticket', 2.00,  50000),
  ('silver',   'umrah',        3.00,  100000),
  ('silver',   'insurance',    5.00,  30000),
  ('gold',     'group_ticket', 3.00,  150000),
  ('gold',     'umrah',        4.00,  300000),
  ('gold',     'insurance',    6.00,  100000),
  ('platinum', 'group_ticket', 5.00,  500000),
  ('platinum', 'umrah',        6.00,  1000000),
  ('platinum', 'insurance',    8.00,  300000)
on conflict (tier, service_type) do nothing;

-- RLS Policies
alter table agents             enable row level security;
alter table agent_otps         enable row level security;
alter table agent_bookings     enable row level security;
alter table agent_transactions enable row level security;
alter table payment_slips      enable row level security;
alter table commission_rules   enable row level security;

-- Agents can read their own row
create policy "Agent reads own profile"
  on agents for select
  using (supabase_uid = auth.uid());

-- Agents can read their own bookings
create policy "Agent reads own bookings"
  on agent_bookings for select
  using (agent_id = (select id from agents where supabase_uid = auth.uid()));

-- Agents can insert bookings
create policy "Agent creates booking"
  on agent_bookings for insert
  with check (agent_id = (select id from agents where supabase_uid = auth.uid()));

-- Agents can read own transactions
create policy "Agent reads own transactions"
  on agent_transactions for select
  using (agent_id = (select id from agents where supabase_uid = auth.uid()));

-- Agents can read own payment slips
create policy "Agent reads own slips"
  on payment_slips for select
  using (agent_id = (select id from agents where supabase_uid = auth.uid()));

-- Agents can insert payment slips
create policy "Agent submits slip"
  on payment_slips for insert
  with check (agent_id = (select id from agents where supabase_uid = auth.uid()));

-- Agents can read OTPs
create policy "Agent reads own otps"
  on agent_otps for select
  using (agent_id = (select id from agents where supabase_uid = auth.uid()));

-- Commission rules are public read
create policy "Anyone reads commission rules"
  on commission_rules for select using (true);

-- ─── INDEXES for performance ───
create index if not exists idx_agent_bookings_agent on agent_bookings(agent_id);
create index if not exists idx_agent_transactions_agent on agent_transactions(agent_id);
create index if not exists idx_agent_transactions_created on agent_transactions(created_at desc);
create index if not exists idx_payment_slips_agent on payment_slips(agent_id);
create index if not exists idx_agent_otps_agent on agent_otps(agent_id);
