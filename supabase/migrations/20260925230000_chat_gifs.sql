-- GIFs in chat (Klipy). Klipy's terms say its media must load straight from
-- the URL its API returns, so a GIF message stores that URL — and only a
-- Klipy media URL is accepted. Photos still store just a Cloudinary ref and
-- never a URL. The blurred preview must be an inline image, never a link,
-- so a message can't make everyone's browser call out to some other server.
-- Cap raised to 3 KB to fit Klipy's blurred preview.
alter table public.messages drop constraint messages_attachment_shape;
alter table public.messages add constraint messages_attachment_shape check (
  attachment is null or (
    jsonb_typeof(attachment) = 'object'
    and attachment->>'ref' ~ '^[A-Za-z0-9_./-]{1,200}$'
    and pg_column_size(attachment) <= 3072
    and (attachment->'lqip' is null or attachment->>'lqip' ~ '^data:image/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$')
    and (
      (attachment->>'type' = 'image' and attachment->'url' is null)
      or (attachment->>'type' = 'gif' and attachment->>'url' ~ '^https://static[0-9]?\.klipy\.com/[A-Za-z0-9_./-]{1,300}$')
    )
  )
);
