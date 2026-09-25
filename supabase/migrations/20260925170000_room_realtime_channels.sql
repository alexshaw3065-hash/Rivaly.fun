-- Instant chat: each room's live channel ("room:<room id>") is a private
-- Realtime channel, governed by these policies on realtime.messages.
-- Messages, reactions and typing are broadcast phone → every phone in the
-- room (~50–150 ms) and saved to the database behind; see chat-composer.tsx.
--
-- Receiving (broadcast + presence): whoever can see the room's chat — the
-- same rule as messages_select. Anonymous viewers of a public room count.
create policy "rivaly_room_channel_read" on realtime.messages
  for select to anon, authenticated
  using (
    realtime.topic() like 'room:%'
    and exists (
      select 1 from public.rooms r
      where r.id::text = substr(realtime.topic(), 6)
        and (
          (r.visibility = 'public' and r.allow_spectators)
          or r.creator_id = (select auth.uid())
          or public.room_has_participant(r.id, (select auth.uid()))
        )
    )
  );

-- Presence ("N watching"): anyone who can see the room can be counted.
create policy "rivaly_room_channel_presence" on realtime.messages
  for insert to anon, authenticated
  with check (
    realtime.messages.extension = 'presence'
    and realtime.topic() like 'room:%'
    and exists (
      select 1 from public.rooms r
      where r.id::text = substr(realtime.topic(), 6)
        and (
          (r.visibility = 'public' and r.allow_spectators)
          or r.creator_id = (select auth.uid())
          or public.room_has_participant(r.id, (select auth.uid()))
        )
    )
  );

-- Broadcasting (messages, reactions, typing): signed-in people who can post
-- in the room — the same rule as messages_insert. A broadcast is only the
-- fast lane; the saved row is the record, and receivers drop any broadcast
-- whose row never arrives (so a spoofed one can't stick).
create policy "rivaly_room_channel_broadcast" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'room:%'
    and exists (
      select 1 from public.rooms r
      where r.id::text = substr(realtime.topic(), 6)
        and (
          (r.visibility = 'public' and r.allow_spectators)
          or r.creator_id = (select auth.uid())
          or public.room_has_participant(r.id, (select auth.uid()))
        )
    )
  );
