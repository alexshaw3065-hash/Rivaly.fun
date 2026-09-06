-- Fixes a real gap: profiles.dynamic_user_id is a single scalar column, so
-- it can only ever represent ONE Dynamic identity per account. Dynamic does
-- not automatically unify a person's Google login and email-OTP login into
-- one identity (confirmed against Dynamic's own docs — that only happens
-- via an explicit, developer-built "link" flow while already signed in,
-- which this app doesn't have). Without this table, a returning user who
-- tries a *different* login method than the one they signed up with would
-- silently get a second, empty Rivaly account instead of their real one.
--
-- This table lets one profile own multiple Dynamic identities. It's
-- additive only — profiles.dynamic_user_id is untouched and still gets set
-- by handle_new_user() on first signup, so nothing that reads it today
-- breaks. New logins are looked up here instead, backfilled with whatever
-- already exists in profiles.dynamic_user_id below.
create table public.dynamic_identities (
  dynamic_user_id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.dynamic_identities enable row level security;
-- No policies — this table only exists for the service-role bridge
-- (src/app/auth/dynamic-actions.ts) to read/write. RLS with zero policies
-- means anon/authenticated get nothing; service_role bypasses RLS entirely,
-- same posture as every other admin-only path in this codebase.

insert into public.dynamic_identities (dynamic_user_id, profile_id)
select dynamic_user_id, id from public.profiles where dynamic_user_id is not null;

-- The bridge can't query auth.users directly — PostgREST only exposes the
-- public schema, and auth.users isn't reachable through the normal
-- supabase-js client even with the service-role key. This is the one
-- narrow, read-only exception: given an email, return the auth.users id
-- that owns it (or null). Restricted to service_role only, same as every
-- other privileged path here — the anon/authenticated grants are revoked
-- explicitly rather than left to whatever Supabase's default happens to be.
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id from auth.users where email = lower(p_email) limit 1;
$$;

revoke execute on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;
