-- Messages can run to 1,000 characters (was 500; the box stopped at 280).
-- Room for a real argument about the match, short of a wall of text that
-- buries the live chat. The composer uses the same number.
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 1000 and (char_length(body) >= 1 or attachment is not null));
