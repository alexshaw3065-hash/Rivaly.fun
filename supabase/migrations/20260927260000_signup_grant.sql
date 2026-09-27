-- Sign-up grant: every new account gets a starting balance (default $5 of
-- devnet USDC) sent to its wallet, from a SEPARATE Rivaly welcome wallet
-- (WELCOME_SECRET_KEY) — never from escrow, so escrow reconciliation stays
-- exact. The app fails closed without that key.
--
-- Guards: once per account and once per wallet (unique), only accounts made
-- after the grant went live (signup_grant_since), a daily total cap, and an
-- admin switch. Low welcome-wallet balance pauses it (the app checks before
-- sending and retries later). Sent from src/lib/grants/signup.ts.

alter table public.platform_settings add column if not exists signup_grant_enabled boolean not null default true;
alter table public.platform_settings add column if not exists signup_grant_cents integer not null default 500 check (signup_grant_cents between 0 and 10000);
alter table public.platform_settings add column if not exists signup_grant_daily_cap_cents bigint not null default 25000 check (signup_grant_daily_cap_cents >= 0);
alter table public.platform_settings add column if not exists signup_grant_since timestamptz not null default now();

create table if not exists public.signup_grants (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  wallet text not null unique,
  cents bigint not null check (cents > 0),
  status text not null default 'pending' check (status in ('pending', 'sent', 'confirmed', 'failed')),
  tx_signature text,
  valid_until_height bigint,
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists signup_grants_open_idx on public.signup_grants (status) where status in ('pending', 'sent', 'failed');
alter table public.signup_grants enable row level security;
drop policy if exists signup_grants_select_own on public.signup_grants;
create policy signup_grants_select_own on public.signup_grants for select using (user_id = (select auth.uid()));

/**
 * Reserve a user's grant: checks every rule and writes (or re-opens a failed)
 * pending row, in one transaction. Service role only. Raises a short reason
 * when the user isn't eligible — the caller treats any raise as "not now".
 */
create or replace function public.start_signup_grant(p_user uuid)
returns table(wallet text, cents bigint)
language plpgsql security definer set search_path = public as $$
declare
  s platform_settings%rowtype;
  p profiles%rowtype;
  g signup_grants%rowtype;
  had boolean;
  today bigint;
begin
  -- One lock for everyone: the daily cap must hold under concurrent signups.
  perform pg_advisory_xact_lock(hashtext('signup_grant'));
  select * into s from platform_settings where id;
  if not coalesce(s.signup_grant_enabled, false) or coalesce(s.signup_grant_cents, 0) <= 0 then raise exception 'grant_off'; end if;
  select * into p from profiles where id = p_user;
  if not found then raise exception 'no_profile'; end if;
  if p.dynamic_wallet_address is null then raise exception 'no_wallet'; end if;
  if p.created_at < s.signup_grant_since then raise exception 'before_grant'; end if;
  if p.banned_at is not null or (p.suspended_until is not null and p.suspended_until > now()) then raise exception 'restricted'; end if;

  select * into g from signup_grants where user_id = p_user;
  had := found; -- captured now: FOUND is overwritten by every later statement
  if had and g.status <> 'failed' then raise exception 'already_granted'; end if;
  if had and g.attempts >= 3 then raise exception 'too_many_attempts'; end if;
  if exists (select 1 from signup_grants x where x.wallet = p.dynamic_wallet_address and x.user_id <> p_user) then
    raise exception 'wallet_already_granted';
  end if;

  select coalesce(sum(x.cents), 0) into today from signup_grants x
  where x.status <> 'failed' and x.created_at >= date_trunc('day', now());
  if today + s.signup_grant_cents > s.signup_grant_daily_cap_cents then raise exception 'daily_cap'; end if;

  if had then
    update signup_grants set status = 'pending', wallet = p.dynamic_wallet_address, cents = s.signup_grant_cents,
      tx_signature = null, valid_until_height = null, error = null, created_at = now(), updated_at = now()
    where user_id = p_user;
  else
    insert into signup_grants (user_id, wallet, cents) values (p_user, p.dynamic_wallet_address, s.signup_grant_cents);
  end if;
  return query select p.dynamic_wallet_address, s.signup_grant_cents::bigint;
end;
$$;
revoke execute on function public.start_signup_grant(uuid) from public, anon, authenticated;

-- A landed grant tells the user (notification) and the ops log (event).
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'joined', 'big_stake', 'faded', 'kickoff', 'won', 'lost', 'refunded', 'reply', 'mention', 'follow',
  'league_join', 'creator_room', 'host_earned', 'welcome_grant'));

create or replace function public.on_signup_grant_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    insert into notifications (user_id, kind, data) values (new.user_id, 'welcome_grant', jsonb_build_object('amount', new.cents));
    insert into platform_events (type, user_id, tx_signature, amount_cents, source, status)
    values ('SIGNUP_GRANT', new.user_id, new.tx_signature, new.cents, 'chain', 'ok');
  elsif new.status = 'failed' and old.status is distinct from 'failed' then
    insert into platform_events (type, user_id, tx_signature, amount_cents, source, status, metadata)
    values ('SIGNUP_GRANT_FAILED', new.user_id, new.tx_signature, new.cents, 'chain', 'failed', jsonb_build_object('error', new.error));
  end if;
  return new;
end;
$$;
revoke execute on function public.on_signup_grant_confirmed() from public, anon, authenticated;
drop trigger if exists signup_grant_confirmed on public.signup_grants;
create trigger signup_grant_confirmed after update on public.signup_grants for each row execute function public.on_signup_grant_confirmed();
