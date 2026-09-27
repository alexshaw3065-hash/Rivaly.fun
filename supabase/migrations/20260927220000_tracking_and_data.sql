-- Product tracking + Rivaly Data (B2B).
--
-- Tracking: first-party, on our own database — no third-party trackers.
--   analytics_events       one row per page view / product action, with an
--                          anonymous id, a session, where the visit came from
--                          (UTM / referrer), device and country. No names,
--                          emails, wallet addresses or message text — ever.
--   analytics_identities   links an anonymous id to the account it later
--                          signed in as, so pre-signup behaviour counts.
--   profiles.acquisition   first-touch source captured at signup.
--
-- Rivaly Data: aggregated, anonymised datasets for partners. Every row
-- represents at least platform_settings.data_min_group distinct people —
-- smaller groups are suppressed, never shown. Partners authenticate with API
-- keys (only a hash is stored); every call is metered.

-- ── Tracking ─────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  event text not null check (event ~ '^[a-z][a-z0-9_]{1,48}$'),
  anon_id text not null check (length(anon_id) between 8 and 64),
  session_id text not null check (length(session_id) between 8 and 64),
  user_id uuid references public.profiles(id) on delete set null,
  path text check (length(path) <= 200),
  referrer_host text check (length(referrer_host) <= 120),
  utm_source text check (length(utm_source) <= 80),
  utm_medium text check (length(utm_medium) <= 80),
  utm_campaign text check (length(utm_campaign) <= 80),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  country text check (length(country) <= 2),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2048)
);
create index if not exists analytics_events_at_idx on public.analytics_events (at desc);
create index if not exists analytics_events_event_idx on public.analytics_events (event, at desc);
create index if not exists analytics_events_anon_idx on public.analytics_events (anon_id, at);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id, at);
create index if not exists analytics_events_user_idx on public.analytics_events (user_id, at) where user_id is not null;
alter table public.analytics_events enable row level security;
drop policy if exists analytics_events_admin_read on public.analytics_events;
create policy analytics_events_admin_read on public.analytics_events for select using (public.is_admin((select auth.uid())));

create table if not exists public.analytics_identities (
  anon_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_seen timestamptz not null default now()
);
create index if not exists analytics_identities_user_idx on public.analytics_identities (user_id);
alter table public.analytics_identities enable row level security;

alter table public.profiles add column if not exists acquisition jsonb;

-- ── Rivaly Data: partners, keys, usage ───────────────────────────────
alter table public.platform_settings add column if not exists data_min_group int not null default 5 check (data_min_group between 3 and 100);

create table if not exists public.data_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  contact text check (length(contact) <= 200),
  datasets text[] not null default '{}',
  rate_per_min int not null default 60 check (rate_per_min between 1 and 6000),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.data_api_keys (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.data_partners(id) on delete cascade,
  prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create table if not exists public.data_api_usage (
  id bigint generated always as identity primary key,
  key_id uuid references public.data_api_keys(id) on delete set null,
  partner_id uuid references public.data_partners(id) on delete set null,
  dataset text not null,
  rows int not null default 0,
  status int not null,
  at timestamptz not null default now()
);
create index if not exists data_api_usage_partner_idx on public.data_api_usage (partner_id, at desc);
create index if not exists data_api_usage_key_idx on public.data_api_usage (key_id, at desc);
alter table public.data_partners enable row level security;
alter table public.data_api_keys enable row level security;
alter table public.data_api_usage enable row level security;
-- Service role only (the admin app and the partner API route).
