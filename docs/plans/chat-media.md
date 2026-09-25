# Chat media: photos, GIFs, instant send — plan (not built)

Agreed as a plan with the founder on 2026-09-25; build when they say go.

## Facts it rests on
- Tenor's GIF API shut down on 2026-06-30. WhatsApp moved to **Klipy** (ex-Tenor team, free tier, near-identical API). GIPHY's free key is rate-limited and not meant for production.
- Cloudinary is already wired (src/lib/cloudinary.ts): unsigned browser → Cloudinary uploads, f_auto/q_auto delivery transforms.

## 1. Nothing heavy in the database
Messages store only a small `attachment` reference (~150 bytes): `{ type: "image"|"gif", ref (Cloudinary public_id or Klipy id), w, h, lqip (<1KB blurred preview) }`. Photos live on Cloudinary; GIFs load from Klipy's CDN — we store none.

## 2. Instant send (text too)
- Client generates the message id → shows it to the sender immediately (0 ms).
- Supabase Realtime **broadcast** to the room channel (~50–150 ms to everyone).
- Insert to `messages` in the background (history/late joiners); receivers dedupe by id.
- Failed insert → the sender's bubble shows "Tap to retry".
- Private rooms: broadcast must use Supabase private channels with Realtime Authorization so only members receive it.

## 3. Photos
1. Pick / paste / drag.
2. Compress on device: longest side 1600px, WebP ~0.8 → ~150–300KB.
3. Broadcast a blurred placeholder at the right aspect ratio instantly.
4. Direct upload to Cloudinary (progress ring); sharp image swaps in for everyone (~1–2 s).
5. Delivery: ~480px thumbnail in chat, ~1600px full-screen, f_auto,q_auto (WebP/AVIF).
6. Reserved aspect-ratio boxes (no layout jump), lazy-load offscreen.

## 4. GIFs
- Picker sheet: trending + search + football quick-picks (Goal, Celebration, Crying, VAR, Ref, Robbed, Cope).
- Play as muted looping MP4/WebP renditions (5–10× smaller than .gif).
- Search via our own route (hides the key, caches popular queries ~1h). PG-13 rating filter.

## 5. Custom images
- V1: own photos.
- V1.5: meme maker — top/bottom captions as Cloudinary text overlays in the URL (no extra storage).

## 6. Safety & limits
- Cloudinary upload preset: images only, ≤8MB, chat folder, room tag.
- No per-user image rate limit (founder decision, 2026-09-25). A message needs text, an image or a GIF.
- **Explicit-image moderation: yes** — Cloudinary's moderation add-on screens every upload before it's shown; a flagged image never reaches the room (the sender sees "This image can't be posted"). Paid per image.
- Private-room images: unguessable public URLs now; signed delivery later if needed.

## 7. Free tiers
- Cloudinary free ≈ 25 GB/month (storage + bandwidth) → tens of thousands of ~250KB photos.
- Optional: auto-delete images from rooms settled >60 days.
- Klipy free tier with search caching.

## 7b. Why not webhooks from Render (asked 2026-09-25)
A webhook is a one-way server-to-server call — it can't reach a phone. Phones need an open WebSocket, which Supabase Realtime already gives every open room. Routing sends through Render would add a hop and need a WebSocket server of our own on a free instance that sleeps. Fastest path: phone → Supabase broadcast → every phone (~50–150 ms), DB save behind. The same broadcast carries messages, reactions, replies, typing ("Tunde is typing…") and presence. Render stays on its one job: the TxLINE stream.

## 8. Changes
- DB: `messages.attachment jsonb null`; relax the body check when an attachment exists.
- New route: GIF search (Klipy) with caching.
- Composer: photo + GIF buttons, paste/drag, upload progress.
- Thread: photo/GIF bubbles with blurred previews; full-screen viewer (pinch-zoom, save); replies quote "📷 Photo"/"GIF"; reactions on media.
- Realtime: broadcast-first send for all messages, DB persist behind.

Build order: instant send → photos → GIFs → meme maker.

## Open decisions (founder)
1. GIF provider: Klipy (recommended) or GIPHY.
2. ~~Explicit-image moderation~~ → decided: add Cloudinary moderation. ~~Rate limit~~ → decided: none.
3. Old images: auto-delete after 60 days, or keep.
4. Keys/config: `KLIPY_API_KEY` in Vercel + .env.local; Cloudinary upload preset rule for the chat folder.
