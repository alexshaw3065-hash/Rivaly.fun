-- Discovered this run: this project has a "public" schema default ACL
-- (set at provisioning) that explicitly grants anon/authenticated EXECUTE
-- on every new function, separate from — and not removed by — a plain
-- "revoke ... from public". Confirmed via has_function_privilege() after
-- the previous migration's revoke still returned true for both roles.
-- The earlier trigger-function lockdowns (see lock_down_trigger_functions_v2)
-- happened to also cover anon/authenticated explicitly, which is why this
-- gap wasn't caught until now. Explicit revoke from anon/authenticated (in
-- addition to public) is the real fix, and should be the default going
-- forward for any new SECURITY DEFINER trigger function in this project.
revoke execute on function public.handle_post_roast_insert() from anon, authenticated, public;
revoke execute on function public.handle_post_roast_delete() from anon, authenticated, public;
