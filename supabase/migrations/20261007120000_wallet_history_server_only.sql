-- Wallet history rows are written only by the server, from transactions read
-- off the chain (reconcileWalletTransactions, service role). Users could
-- insert their own rows directly, which on 2026-10-05 was used to log a fake
-- "deposit" that then showed in the admin finance stream. Reading your own
-- history is unchanged.
drop policy if exists wallet_transactions_insert_self on public.wallet_transactions;
