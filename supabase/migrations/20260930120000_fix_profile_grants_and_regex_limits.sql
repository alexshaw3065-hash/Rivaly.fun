-- Two production bugs found 2026-09-30 from the founder's phone test.
--
-- 1. Edit Profile failed with "permission denied for table profiles".
--    authenticated has column-level UPDATE on profiles, and the columns added
--    later (banner colour, ring colour, cover photo, show-host-earnings) were
--    never granted — so any save that included them was refused outright,
--    even when only the bio changed. Row access is unchanged: the
--    profiles_update_self policy still limits every update to your own row.
grant update (banner_color, ring_color, banner_url, show_host_earnings) on public.profiles to authenticated;

-- 2. GIF posts, GIF chat messages and cover photos failed with "invalid
--    regular expression: invalid repetition count(s)". Postgres caps a
--    {m,n} repetition at 255, so the {1,300} in these checks made the check
--    itself error whenever it ran. Same rules, with the length limit written
--    separately.
alter table public.posts drop constraint posts_attachment_shape;
alter table public.posts add constraint posts_attachment_shape check (
  attachment is null or (
    jsonb_typeof(attachment) = 'object'
    and attachment->>'ref' ~ '^[A-Za-z0-9_./-]{1,200}$'
    and pg_column_size(attachment) <= 3072
    and (attachment->'lqip' is null or attachment->>'lqip' ~ '^data:image/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$')
    and (
      (attachment->>'type' = 'image' and attachment->'url' is null)
      or (attachment->>'type' = 'gif' and char_length(attachment->>'url') <= 400 and attachment->>'url' ~ '^https://static[0-9]?\.klipy\.com/[A-Za-z0-9_./-]+$')
    )
  )
);

alter table public.messages drop constraint messages_attachment_shape;
alter table public.messages add constraint messages_attachment_shape check (
  attachment is null or (
    jsonb_typeof(attachment) = 'object'
    and attachment->>'ref' ~ '^[A-Za-z0-9_./-]{1,200}$'
    and pg_column_size(attachment) <= 3072
    and (attachment->'lqip' is null or attachment->>'lqip' ~ '^data:image/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$')
    and (
      (attachment->>'type' = 'image' and attachment->'url' is null)
      or (attachment->>'type' = 'gif' and char_length(attachment->>'url') <= 400 and attachment->>'url' ~ '^https://static[0-9]?\.klipy\.com/[A-Za-z0-9_./-]+$')
    )
  )
);

alter table public.profiles drop constraint profiles_banner_url_check;
alter table public.profiles add constraint profiles_banner_url_check check (
  char_length(banner_url) <= 400
  and banner_url ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/[A-Za-z0-9_./,-]+$'
);
