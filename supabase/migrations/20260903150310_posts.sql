-- Arena Feed's banter/thesis posts, real for the first time. room_id is
-- nullable — a composer for "thesis" (room-attached) posts doesn't exist
-- yet, so every real post created right now is banter (room_id null); the
-- column exists for that future entry point.
create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 280),
  room_id     uuid references public.rooms(id) on delete set null,
  roast_count integer not null default 0,
  created_at  timestamptz not null default now()
);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_room_idx on public.posts (room_id) where room_id is not null;

alter table public.posts enable row level security;

-- Public read, no cross-table subquery — unlike rooms/entries, posts have
-- no circular RLS dependency to worry about.
create policy posts_select on public.posts for select using (true);
create policy posts_insert_self on public.posts for insert with check (author_id = (select auth.uid()));
