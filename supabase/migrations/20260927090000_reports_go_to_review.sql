-- Reports no longer take anything down on their own (founder decision,
-- 2026-09-27): no "3 reports hides it" rule. A report hides the content for
-- the person who reported it, and lands in content_reports for review — an
-- admin page will read that queue and decide. hidden_at stays: it's what
-- the admin sets to take something down for everyone.

create or replace function public.report_content(p_kind text, p_id uuid, p_reason text)
returns boolean -- always false now: a report never hides content for everyone
language plpgsql security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  author uuid;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_kind not in ('message', 'post') then raise exception 'bad_kind'; end if;
  if p_reason not in ('abuse', 'hate', 'explicit', 'spam', 'other') then raise exception 'bad_reason'; end if;

  if p_kind = 'message' then
    select user_id into author from messages where id = p_id;
  else
    select author_id into author from posts where id = p_id;
  end if;
  if author is null then raise exception 'not_found'; end if;
  if author = me then raise exception 'own_content'; end if;

  if (select count(*) from content_reports where reporter_id = me and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'report_rate_limit';
  end if;

  insert into content_reports (reporter_id, target_kind, target_id, reason)
  values (me, p_kind, p_id, p_reason)
  on conflict do nothing;
  return false;
end;
$$;
