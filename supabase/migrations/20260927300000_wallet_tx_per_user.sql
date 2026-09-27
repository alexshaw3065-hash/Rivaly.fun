-- One on-chain transaction can belong to several people's history: a payout
-- batch pays up to six winners in a single transaction. The old global
-- UNIQUE (tx_signature) let the first winner to open their wallet claim the
-- row, and everyone else's history silently skipped it. Unique per person
-- instead — still exactly one row per (person, transaction).
alter table public.wallet_transactions drop constraint if exists wallet_transactions_tx_signature_key;
alter table public.wallet_transactions drop constraint if exists wallet_transactions_user_tx_key;
alter table public.wallet_transactions add constraint wallet_transactions_user_tx_key unique (user_id, tx_signature);
