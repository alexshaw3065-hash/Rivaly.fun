-- Password sign-in to /admin (founder decision 2026-09-27): brute-force
-- protection needs a record of attempts. Only a hash of the IP is kept.
create table if not exists public.admin_login_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists admin_login_attempts_ip_idx on public.admin_login_attempts (ip_hash, at desc);
create index if not exists admin_login_attempts_at_idx on public.admin_login_attempts (at desc);
alter table public.admin_login_attempts enable row level security;
-- No policies: service role only.

-- Actions taken under the shared password have no personal account.
alter table public.admin_audit add column if not exists admin_label text;
