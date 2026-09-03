-- Real roasting (the 🔥 button) — mirrors follows exactly: a self-only
-- join table plus a trigger-maintained counter on the parent row.
create table public.post_roasts (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_roasts enable row level security;
create policy post_roasts_select_self on public.post_roasts for select using (user_id = (select auth.uid()));
create policy post_roasts_insert_self on public.post_roasts for insert with check (user_id = (select auth.uid()));
create policy post_roasts_delete_self on public.post_roasts for delete using (user_id = (select auth.uid()));

create or replace function public.handle_post_roast_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.posts set roast_count = roast_count + 1 where id = new.post_id;
  return new;
end;
$$;

create trigger on_post_roast_created
  after insert on public.post_roasts
  for each row execute function public.handle_post_roast_insert();

create or replace function public.handle_post_roast_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.posts set roast_count = greatest(roast_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create trigger on_post_roast_deleted
  after delete on public.post_roasts
  for each row execute function public.handle_post_roast_delete();

revoke execute on function public.handle_post_roast_insert() from public;
revoke execute on function public.handle_post_roast_delete() from public;
