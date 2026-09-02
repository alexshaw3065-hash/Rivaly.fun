-- Postgres grants EXECUTE on new functions to PUBLIC by default, and both
-- anon/authenticated inherit through PUBLIC — revoking from just those two
-- roles (previous migration) didn't actually remove access, confirmed by
-- querying has_function_privilege() directly. Revoke from PUBLIC itself.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_follow_insert() from public;
revoke execute on function public.handle_follow_delete() from public;
revoke execute on function public.handle_new_room() from public;
revoke execute on function public.handle_new_entry() from public;
