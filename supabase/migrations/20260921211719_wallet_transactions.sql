-- Real deposit/withdrawal history for Dynamic-backed wallets. The wallet
-- itself is non-custodial — Rivaly is never in the money path, so this
-- table is a convenience log for fast reads, never the source of truth for
-- balance (that's always a live on-chain read). Every row carries the real
-- tx_signature, so nothing here has to be trusted blindly — it's directly
-- checkable against Solana Explorer. RLS-only, no service-role: unlike the
-- Dynamic login bridge, there's no reason a client can't insert its own row
-- the moment its own action (Send Balance, connect-a-wallet funding)
-- reports success, same pattern already used for messages/entries.
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal')),
  amount_micros bigint not null check (amount_micros > 0),
  counterparty_address text,
  tx_signature text not null unique,
  created_at timestamptz not null default now()
);

create index wallet_transactions_user_id_created_at_idx
  on public.wallet_transactions (user_id, created_at desc);

alter table public.wallet_transactions enable row level security;

-- No update/delete policy — a logged transaction is immutable, matching
-- how the chain itself works.
create policy "wallet_transactions_select_self" on public.wallet_transactions
  for select using (auth.uid() = user_id);

create policy "wallet_transactions_insert_self" on public.wallet_transactions
  for insert with check (auth.uid() = user_id);
