-- Dynamic.xyz login bridge — see src/app/auth/dynamic-actions.ts. Real
-- signups no longer collect a Rivaly username up front (same shape as the
-- existing OAuth placeholder-username flow), so handle_new_user() now also
-- persists dynamic_user_id (the reliable lookup key for a returning
-- Dynamic user — email can't serve that role since wallet-only signups
-- may not have one) and dynamic_wallet_address off the new user's
-- metadata, alongside the username/display-name logic it already had.
alter table public.profiles
  add column dynamic_user_id text unique,
  add column dynamic_wallet_address text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text := new.raw_user_meta_data->>'username';
  v_display_name text := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1));
  v_is_placeholder boolean := v_username is null;
  v_dynamic_user_id text := new.raw_user_meta_data->>'dynamic_user_id';
  v_dynamic_wallet_address text := new.raw_user_meta_data->>'dynamic_wallet_address';
begin
  if v_username is null then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;

  insert into public.profiles (id, username, display_name, username_is_placeholder, dynamic_user_id, dynamic_wallet_address)
  values (new.id, v_username, v_display_name, v_is_placeholder, v_dynamic_user_id, v_dynamic_wallet_address);

  return new;
end;
$$;
