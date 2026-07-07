-- Tickets, each linked to one event and one member
-- Run in Supabase SQL editor

create table tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  member_id uuid not null references members (id) on delete cascade,
  status text not null default 'valid' check (status in ('valid', 'used')),
  created_at timestamptz not null default now(),
  unique (event_id, member_id)
);

alter table tickets enable row level security;

create policy "members can view own tickets" on tickets
  for select using (auth.uid() = member_id or is_admin());

create policy "members can claim their own ticket" on tickets
  for insert with check (auth.uid() = member_id or is_admin());

create policy "admin can update tickets" on tickets
  for update using (is_admin());
