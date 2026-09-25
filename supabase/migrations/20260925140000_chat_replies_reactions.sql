-- Discord-style chat: replies and reactions.
--
-- Replies: a message can point at the one it answers. Only within the same
-- room (checked by trigger, so a reply can't reach into a private room's
-- message by id). If the original is deleted the reply stays, unlinked.
alter table public.messages
  add column reply_to uuid references public.messages(id) on delete set null;

create or replace function public.messages_reply_same_room()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.reply_to is not null and not exists (
    select 1 from public.messages m where m.id = new.reply_to and m.room_id = new.room_id
  ) then
    raise exception 'reply_to must be a message in the same room';
  end if;
  return new;
end;
$$;

create trigger messages_reply_same_room
  before insert on public.messages
  for each row execute function public.messages_reply_same_room();

-- Reactions: one row per person per emoji per message, from a fixed set of
-- football reactions (no free-text emoji to moderate). room_id is carried so
-- the room's realtime channel can filter on it.
create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('🔥', '😂', '😭', '😤', '👀', '⚽', '🧢', '💯', '👏', '😱')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index message_reactions_room_idx on public.message_reactions (room_id);

create or replace function public.message_reactions_same_room()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.messages m where m.id = new.message_id and m.room_id = new.room_id) then
    raise exception 'reaction must be on a message in the same room';
  end if;
  return new;
end;
$$;

create trigger message_reactions_same_room
  before insert on public.message_reactions
  for each row execute function public.message_reactions_same_room();

alter table public.message_reactions enable row level security;

-- Same visibility as the room's messages.
create policy "message_reactions_select" on public.message_reactions for select using (
  exists (select 1 from public.rooms r where r.id = message_reactions.room_id and r.visibility = 'public' and r.allow_spectators)
  or exists (select 1 from public.rooms r where r.id = message_reactions.room_id and r.creator_id = (select auth.uid()))
  or public.room_has_participant(room_id, (select auth.uid()))
);

-- Anyone who can post in the room can react, as themselves.
create policy "message_reactions_insert_self" on public.message_reactions for insert with check (
  user_id = (select auth.uid())
  and (
    exists (select 1 from public.rooms r where r.id = message_reactions.room_id and r.visibility = 'public' and r.allow_spectators)
    or exists (select 1 from public.rooms r where r.id = message_reactions.room_id and r.creator_id = (select auth.uid()))
    or public.room_has_participant(room_id, (select auth.uid()))
  )
);

create policy "message_reactions_delete_self" on public.message_reactions for delete using (user_id = (select auth.uid()));

-- Live: removals need the old row's room_id for the channel filter.
alter table public.message_reactions replica identity full;
alter publication supabase_realtime add table public.message_reactions;
