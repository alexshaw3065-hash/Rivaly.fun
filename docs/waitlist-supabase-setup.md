# Waitlist Supabase setup

The waitlist uses its **own** Supabase project, separate from the main-site
database (see [CLAUDE.md](../CLAUDE.md) tech stack notes). This keeps signups
decoupled from the product schema, which doesn't exist yet.

## 1. Create the table

In the waitlist project's **SQL Editor**, run:

```sql
create table if not exists public.waitlist_signups (
  id          bigint generated always as identity primary key,
  email       text not null unique,
  source      text,
  referral    text,
  created_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness safety net (the API also lowercases before insert).
create unique index if not exists waitlist_signups_email_lower_idx
  on public.waitlist_signups (lower(email));

-- Writes go through the server-side service role key only. Enable RLS with no
-- policies so the anon/public keys can never read or write this table.
alter table public.waitlist_signups enable row level security;
```

## 2. Wire up env vars

From the waitlist project's **Settings → API**, copy the Project URL and the
`service_role` key, then set:

```
WAITLIST_SUPABASE_URL=...
WAITLIST_SUPABASE_SERVICE_ROLE_KEY=...
```

- **Locally:** add them to `.env.local` (gitignored).
- **Vercel:** add both to the `rivaly-fun` project's Environment Variables
  (Production + Preview). The service role key is a secret — server-only, never
  prefixed `NEXT_PUBLIC_`.

## 3. Behavior before it's connected

Until these vars are set, `POST /api/waitlist` returns `202 { stored: false }`.
The landing page still shows a success state but the email isn't persisted —
so no signups are silently lost to a fake "thanks". Once the vars are live,
emails are stored and the live counter reflects the real count.
