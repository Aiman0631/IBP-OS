create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  phone text,
  email text,
  source text default 'WhatsApp',
  status text not null default 'New' check (status in ('New','Contacted','Qualified','Proposal','Won','Lost')),
  score integer not null default 50 check (score between 0 and 100),
  value numeric(12,2) not null default 0,
  last_message text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  wa_message_id text,
  direction text not null check (direction in ('inbound','outbound')),
  body text not null,
  status text default 'received',
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  type text not null default 'note',
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists leads_phone_idx on public.leads(phone);
create index if not exists messages_lead_idx on public.messages(lead_id, created_at);
create index if not exists activities_lead_idx on public.activities(lead_id, created_at);

alter table public.leads enable row level security;
alter table public.messages enable row level security;
alter table public.activities enable row level security;

create policy "public demo leads read" on public.leads for select using (true);
create policy "public demo leads insert" on public.leads for insert with check (true);
create policy "public demo leads update" on public.leads for update using (true);
create policy "public demo messages read" on public.messages for select using (true);
create policy "public demo messages insert" on public.messages for insert with check (true);
create policy "public demo activities read" on public.activities for select using (true);
create policy "public demo activities insert" on public.activities for insert with check (true);

insert into public.leads (name, company, phone, email, source, status, score, value, last_message)
values
('Aiman Hakim','Nexa Build','60123456789','aiman@nexa.example','WhatsApp','Qualified',92,18500,'Can you send the proposal today?'),
('Sarah Lim','Luma Studio','60111222333','sarah@luma.example','Instagram','Contacted',74,7200,'I am interested, what is the lead time?'),
('Daniel Tan','Vertex Works','60199887766','daniel@vertex.example','WhatsApp','Proposal',86,24000,'We need this before the end of the month.')
on conflict do nothing;
