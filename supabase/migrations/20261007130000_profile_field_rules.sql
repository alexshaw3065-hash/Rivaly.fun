-- Profile fields can be written straight to the database (column grants), not
-- only through the app's updateProfile action, so the database enforces the
-- same rules. On 2026-10-05 a scripted account set its photo to example.com
-- that way (any external image could also log every viewer's IP).
--   • avatar_url: null, or one of our Cloudinary delivery URLs (as banners).
--   • display_name: 1–50 characters; bio: up to 160 (the app's own limit).
update public.profiles set avatar_url = null
  where avatar_url is not null
    and avatar_url !~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/[A-Za-z0-9_./,-]+$';

alter table public.profiles
  add constraint profiles_avatar_url_check check (
    avatar_url is null
    or (char_length(avatar_url) <= 400
        and avatar_url ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/[A-Za-z0-9_./,-]+$')
  ),
  add constraint profiles_display_name_length check (char_length(display_name) between 1 and 50),
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 160);
