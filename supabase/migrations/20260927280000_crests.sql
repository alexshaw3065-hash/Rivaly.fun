-- Real team and league logos. Source: TheSportsDB (founder checked their
-- terms, 2026-09-27) — credited on /terms, used as-is (resized only, never
-- altered). Each badge is fetched once, resized to a 128px WebP and stored in
-- our own public `crests` bucket (CDN, cached a year), so the app never
-- loads a third-party image. The generated monogram crest stays as the
-- instant placeholder and the fallback. Synced by src/lib/crests/sync.ts.

create table if not exists public.crests (
  kind text not null check (kind in ('team', 'league')),
  -- crestKey(name) from src/lib/crests/key.ts: lower-case, accents stripped.
  name_key text not null,
  sport_id integer,
  path text not null,
  source text not null default 'thesportsdb',
  source_id text,
  source_name text,
  updated_at timestamptz not null default now(),
  primary key (kind, name_key)
);
alter table public.crests enable row level security;
drop policy if exists crests_read on public.crests;
create policy crests_read on public.crests for select using (true);

-- Names we looked up and couldn't match — retried weekly, listed in
-- /admin → Matches so a wrong or missing crest can be spotted.
create table if not exists public.crest_misses (
  kind text not null check (kind in ('team', 'league')),
  name_key text not null,
  name text not null,
  sport_id integer,
  reason text,
  attempts integer not null default 1,
  tried_at timestamptz not null default now(),
  primary key (kind, name_key)
);
alter table public.crest_misses enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crests', 'crests', true, 262144, array['image/webp'])
on conflict (id) do update set public = true, file_size_limit = 262144, allowed_mime_types = array['image/webp'];
