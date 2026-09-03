-- Unindexed FK caught by the performance advisor (same class of fix as
-- follows.following_id in rls_perf_fixes.sql).
create index messages_user_id_idx on public.messages (user_id);
