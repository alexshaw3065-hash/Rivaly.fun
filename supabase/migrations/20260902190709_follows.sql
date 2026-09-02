create table public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;

create policy "follows_select_all" on public.follows for select using (true);
create policy "follows_insert_self" on public.follows for insert
  with check (auth.uid() = follower_id);
create policy "follows_delete_self" on public.follows for delete
  using (auth.uid() = follower_id);

-- Keep profiles.follower_count / following_count in sync on both sides
-- of every follow/unfollow, so reads stay a single-row fetch.
create or replace function public.handle_follow_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
  return new;
end;
$$;

create trigger on_follow_created
  after insert on public.follows
  for each row execute function public.handle_follow_insert();

create or replace function public.handle_follow_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = old.following_id;
  return old;
end;
$$;

create trigger on_follow_deleted
  after delete on public.follows
  for each row execute function public.handle_follow_delete();
