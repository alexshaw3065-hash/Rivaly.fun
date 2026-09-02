-- These functions must only ever run as triggers, never be callable
-- directly (Supabase auto-exposes every function as a REST RPC endpoint
-- by default — e.g. POST /rest/v1/rpc/handle_new_entry — which would let
-- anyone manipulate room totals/counters outside the real insert path).
-- Revoking EXECUTE from anon/authenticated does not affect the trigger
-- itself firing on insert/delete; it only blocks direct RPC invocation.
--
-- NOTE: this revoke turned out to be insufficient on its own — see the
-- next migration. Postgres grants EXECUTE to PUBLIC by default, and
-- anon/authenticated inherit through PUBLIC, so revoking from just these
-- two roles left the functions still callable. Kept here for an accurate
-- history; the real fix is 20260902190940_lock_down_trigger_functions_v2.sql.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.handle_follow_insert() from anon, authenticated;
revoke execute on function public.handle_follow_delete() from anon, authenticated;
revoke execute on function public.handle_new_room() from anon, authenticated;
revoke execute on function public.handle_new_entry() from anon, authenticated;
