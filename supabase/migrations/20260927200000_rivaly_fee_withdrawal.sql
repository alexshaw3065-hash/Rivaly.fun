-- Withdrawing Rivaly's accrued 3% (owner only, from /admin → Finance):
-- every unclaimed Rivaly fee is attached to one claim, sent in one transfer
-- to platform_settings.fee_wallet. Same safety as host claims — recorded
-- before signing, one in flight at a time, recovered by the settlement cron.

create unique index if not exists fee_claims_one_open_rivaly on public.fee_claims (kind) where status in ('pending', 'sent') and kind = 'rivaly';

create or replace function public.start_rivaly_withdrawal(p_admin uuid, p_wallet text)
returns table(claim_id uuid, cents bigint)
language plpgsql security definer set search_path = public as $$
declare
  total bigint;
  cid uuid;
begin
  perform pg_advisory_xact_lock(hashtext('rivaly_withdrawal'));
  if exists (select 1 from fee_claims where kind = 'rivaly' and status in ('pending', 'sent')) then
    raise exception 'withdrawal_in_progress';
  end if;
  select coalesce(sum(f.cents), 0) into total
  from room_fees f left join fee_claims c on c.id = f.claim_id
  where f.kind = 'rivaly' and (f.claim_id is null or c.status = 'failed');
  if total <= 0 then raise exception 'nothing_to_withdraw'; end if;
  insert into fee_claims (kind, user_id, wallet, cents) values ('rivaly', p_admin, p_wallet, total) returning id into cid;
  update room_fees f set claim_id = cid
  from (select f2.room_id from room_fees f2 left join fee_claims c on c.id = f2.claim_id
        where f2.kind = 'rivaly' and (f2.claim_id is null or c.status = 'failed')) x
  where f.room_id = x.room_id and f.kind = 'rivaly';
  return query select cid, total;
end;
$$;
revoke execute on function public.start_rivaly_withdrawal(uuid, text) from public, anon, authenticated;
