-- ═══════════════════════════════════════════════════════
--  EASTWESTPK — Supabase SQL Schema
--  Run this in Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════

-- CUSTOMERS table
create table if not exists customers (
  id           uuid default gen_random_uuid() primary key,
  email        text unique not null,
  phone        text,
  full_name    text,
  is_verified  boolean default false,
  created_at   timestamptz default now()
);

-- BOOKINGS table
create table if not exists bookings (
  id              uuid default gen_random_uuid() primary key,
  booking_ref     text unique not null,
  customer_email  text,
  customer_phone  text,
  customer_name   text,
  is_guest        boolean default false,
  tour_name       text not null,
  tour_type       text,
  duration        text,
  price           text,
  travel_date     date,
  pax_adults      int default 1,
  pax_children    int default 0,
  pax_infants     int default 0,
  room_type       text,
  travelers       jsonb,   -- array of {name, nationality, passport_no, dob, passport_expiry}
  special_requests text,
  contact_pref    text,
  status          text default 'new',  -- new, pending, confirmed, cancelled
  created_at      timestamptz default now()
);

-- BLOGS table
create table if not exists blogs (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  slug        text unique not null,
  excerpt     text,
  content     text,
  cover_image text,
  category    text default 'Travel Tips',
  published   boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ADMIN table (single admin, bcrypt hashed password)
create table if not exists admin_users (
  id            serial primary key,
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz default now()
);

-- Row Level Security (RLS) — public can INSERT bookings, auth users can read
alter table bookings  enable row level security;
alter table customers enable row level security;
alter table blogs     enable row level security;

-- Policies
create policy "Anyone can create booking"   on bookings  for insert with check (true);
create policy "Anyone can read blogs"       on blogs     for select using (published = true);
create policy "Anyone can upsert customer"  on customers for insert with check (true);
create policy "Customer reads own bookings" on bookings  for select using (customer_email = current_setting('request.jwt.claims', true)::json->>'email');
