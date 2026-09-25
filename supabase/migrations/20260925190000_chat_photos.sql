-- Chat photos. A message can carry a small attachment reference — never the
-- image itself (that lives on Cloudinary): { type, ref, w, h, lqip }, where
-- ref is a Cloudinary public_id (the app builds the delivery URL from our own
-- cloud name, so a ref can't point anywhere else) and lqip is a tiny blurred
-- preview (a few hundred bytes). Capped at 2 KB. See docs/plans/chat-media.md.
alter table public.messages add column attachment jsonb;

-- A photo can go without a caption; everything else still needs text.
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 500 and (char_length(body) >= 1 or attachment is not null));

alter table public.messages add constraint messages_attachment_shape check (
  attachment is null or (
    jsonb_typeof(attachment) = 'object'
    and attachment->>'type' in ('image', 'gif')
    and attachment->>'ref' ~ '^[A-Za-z0-9_./-]{1,200}$'
    and pg_column_size(attachment) <= 2048
  )
);

-- About five photos a minute per person, enforced here so no client can
-- skip it.
create index if not exists messages_user_created_idx on public.messages (user_id, created_at desc);

create or replace function public.messages_photo_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.attachment->>'type' = 'image' and (
    select count(*) from public.messages m
    where m.user_id = new.user_id
      and m.attachment->>'type' = 'image'
      and m.created_at > now() - interval '1 minute'
  ) >= 5 then
    raise exception 'photo_rate_limit';
  end if;
  return new;
end;
$$;

create trigger messages_photo_rate_limit
  before insert on public.messages
  for each row execute function public.messages_photo_rate_limit();

revoke execute on function public.messages_photo_rate_limit() from anon, authenticated, public;
