-- Spectators read, rivals talk (founder, 2026-09-30). Chat, reactions and the
-- room's live broadcast lane (messages, typing) are for the host and anyone
-- with a stake in the room. Spectators in a public room that allows them can
-- still read and be counted as watching (select + presence are unchanged);
-- where spectators aren't allowed they can't read the chat at all.

drop policy if exists messages_insert_self on public.messages;
create policy messages_insert_self on public.messages
  for insert with check (
    user_id = (select auth.uid())
    and not public.is_restricted((select auth.uid()))
    and not public.feature_on('chat_paused')
    and (
      exists (select 1 from public.rooms r where r.id = messages.room_id and r.creator_id = (select auth.uid()))
      or public.room_has_participant(room_id, (select auth.uid()))
    )
  );

drop policy if exists message_reactions_insert_self on public.message_reactions;
create policy message_reactions_insert_self on public.message_reactions
  for insert with check (
    user_id = (select auth.uid())
    and (
      exists (select 1 from public.rooms r where r.id = message_reactions.room_id and r.creator_id = (select auth.uid()))
      or public.room_has_participant(room_id, (select auth.uid()))
    )
  );

drop policy if exists rivaly_room_channel_broadcast on realtime.messages;
create policy rivaly_room_channel_broadcast on realtime.messages
  for insert to authenticated with check (
    extension = 'broadcast'
    and realtime.topic() like 'room:%'
    and exists (
      select 1 from public.rooms r
      where r.id::text = substr(realtime.topic(), 6)
        and (r.creator_id = (select auth.uid()) or public.room_has_participant(r.id, (select auth.uid())))
    )
  );
