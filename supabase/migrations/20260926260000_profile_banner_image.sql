-- A banner photo on the profile (Cloudinary, uploaded from the edit sheet).
-- Only a delivery URL from a Cloudinary account is accepted; the app also
-- checks it's our own cloud before saving. No photo = the banner colour.
alter table public.profiles
  add column banner_url text check (banner_url ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/[A-Za-z0-9_./,-]{1,300}$');
