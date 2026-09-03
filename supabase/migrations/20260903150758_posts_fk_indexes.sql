-- Unindexed FKs caught by the performance advisor, same class of fix as
-- messages_user_id_index.sql.
create index posts_author_id_idx on public.posts (author_id);
create index post_roasts_user_id_idx on public.post_roasts (user_id);
