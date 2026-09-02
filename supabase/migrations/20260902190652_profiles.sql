-- profiles: 1:1 with auth.users, created only via trigger on signup
create table public.profiles (
  id                      uuid primary key references auth.users(id) on delete cascade,
  username                text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name            text not null,
  avatar_url              text,
  bio                     text,
  social_links            jsonb not null default '[]'::jsonb check (jsonb_array_length(social_links) <= 5),
  follower_count          integer not null default 0,
  following_count         integer not null default 0,
  rooms_created_count     integer not null default 0,
  prediction_accuracy     numeric(4,3) not null default 0,
  total_winnings_cents    bigint not null default 0,
  username_is_placeholder boolean not null default false,
  created_at              timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- Column-level privilege restriction (RLS alone can't restrict which
-- columns an UPDATE touches) — clients may only ever change these fields,
-- never follower_count/rooms_created_count/prediction_accuracy/etc, which
-- are exclusively trigger-maintained.
revoke update on public.profiles from authenticated;
grant update (username, display_name, avatar_url, bio, social_links, username_is_placeholder)
  on public.profiles to authenticated;

-- Auto-create a profile row the moment someone signs up. OAuth signups
-- (Google/Apple) never collect a username up front, so they get a
-- generated placeholder and claim a real one post-redirect
-- (username_is_placeholder = true until then).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text := new.raw_user_meta_data->>'username';
  v_display_name text := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));
  v_is_placeholder boolean := v_username is null;
begin
  if v_username is null then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;

  insert into public.profiles (id, username, display_name, username_is_placeholder)
  values (new.id, v_username, v_display_name, v_is_placeholder);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
