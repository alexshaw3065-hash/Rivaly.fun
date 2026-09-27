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
- Failed insert → the message quietly leaves the chat and the text goes back in the box (no delivery-state labels — founder decision 2026-09-25). Receivers drop any live message whose saved row never arrives within 15 s.
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

## 6. Safety & limits
- Cloudinary upload preset: images only, ≤8MB, chat folder, room tag.
- ~5 images a minute per person. A message needs text, an image or a GIF.
- No paid moderation add-on (founder decision, 2026-09-25 — cost). Report-and-remove is the safety net. Built 2026-09-26: Report on any chat message or Arena post (not your own) — gone for the reporter at once and queued in `content_reports` for review. No automatic take-down (founder, 2026-09-27): a reviewer sets `hidden_at` to remove it for everyone, via the planned admin page.
- Private-room images: unguessable public URLs now; signed delivery later if needed.

## 7. Free tiers
- Cloudinary free ≈ 25 GB/month (storage + bandwidth) → tens of thousands of ~250KB photos.
- Optional: auto-delete images from rooms settled >60 days.
- Klipy free tier with search caching.

## 7b. Why not webhooks from Render (asked 2026-09-25)
A webhook is a one-way server-to-server call — it can't reach a phone. Phones need an open WebSocket, which Supabase Realtime already gives every open room. Routing sends through Render would add a hop and need a WebSocket server of our own on a free instance that sleeps. Fastest path: phone → Supabase broadcast → every phone (~50–150 ms), DB save behind. The same broadcast carries messages, reactions, replies, typing ("Tunde is typing…") and presence. Render stays on its one job: the TxLINE stream.

## 7c. How WhatsApp, Discord and X make it instant — and what we copy
- **One always-open connection per device.** WhatsApp: a persistent connection to Erlang servers (an XMPP-derived protocol). Discord: a WebSocket "gateway" written in Elixir (Erlang VM). X: a persistent connection for DMs (its 2025 XChat rebuild is less documented). **Ours:** Supabase Realtime — itself an Elixir/Phoenix server, the same family of technology as Discord's gateway and WhatsApp's backend.
- **The phone names the message first.** Discord sends a client `nonce`; WhatsApp gives each message an id on the phone. The sender sees it instantly and the server's echo is matched to it. **Copy:** client-generated UUID, optimistic bubble, dedupe on the echo.
- **Fan out from memory, save alongside.** The server pushes to everyone connected straight away; storage (Discord: ScyllaDB) doesn't sit in the delivery path. **Copy:** broadcast first, DB insert behind.
- **Catch-up on reconnect.** After a dropped connection or a backgrounded app, the client fetches everything since the last message it has. **Copy:** on reconnect/visibility, load messages newer than the latest one on screen.
- **Typing and presence** ride the same connection ("Tunde is typing…", "N watching").
- **Push notifications for people not in the app** (APNs/FCM). **Later:** web push for replies and room results.

## 8. Changes
- DB: `messages.attachment jsonb null`; relax the body check when an attachment exists.
- New route: GIF search (Klipy) with caching.
- Composer: photo + GIF buttons, paste/drag, upload progress.
- Thread: photo/GIF bubbles with blurred previews; full-screen viewer (pinch-zoom, save); replies quote "📷 Photo"/"GIF"; reactions on media.
- Realtime: broadcast-first send for all messages, DB persist behind.

Build order: instant send → photos → GIFs.

## Status
- **Instant send: built (2026-09-25).** Private room channel `room:<id>` (migration 20260925170000). Measured from the dev machine to Supabase (eu-west-1, Ireland), 30 samples each: live broadcast median **253 ms** (p90 300, max 424) vs database→realtime median **577 ms** (p90 933, max 1470). Sender sees their own message at 0 ms. Anonymous broadcast into a room channel: delivered to 0 viewers (policy holds). The ~250 ms floor is the network round trip to Ireland.
- **Photos: built (2026-09-25).** Migration 20260925190000 (`messages.attachment`, shape check, 5 images/min trigger). Pick, paste or drag a photo: the sender sees it instantly with an upload ring, everyone else sees the blurred preview at the right size straight away, and the real image fades in when the upload lands. Tested with a 4000×3000 camera-size photo (5.5 MB): shrunk on the phone to 1600×1200 WebP, **231 KB** in **~1.1 s**; blurred preview is 783 bytes; upload took ~3.7 s from the dev machine; the chat-size copy Cloudinary serves is **4 KB**. The DB row holds only the ~1 KB reference. Saves retry silently up to 3 times on a network drop.
- **GIFs: built (2026-09-25).** Emoji button → GIFs tab: trending, then Klipy search (debounced, cached) with football shortcuts (Goal, VAR, Offside…), placeholder "Search KLIPY" (Klipy's one required attribution). Searches run in the browser as Klipy's terms require, so the key is public (`next.config.ts` exposes `KLIPY_API_KEY`). A sent GIF stores Klipy's own video URL (the database only accepts `static*.klipy.com`), plays as a small looping video only while on screen, and sends like text — nothing to upload. Klipy gets a one-way hash as the customer id, never our user id. Test key: 100 requests/hour — request production access in the Klipy partner panel before launch.

## Open decisions (founder)
1. ~~GIF provider~~ → decided: Klipy (key wired later).
2. ~~Explicit-image moderation~~ → decided: no paid add-on; report-and-remove. Rate limit ~5 images/min stays.
3. ~~Old images~~ → decided: delete after 60 days. Built: `/api/cron/expire-photos`, pinged daily by the Render worker; the message keeps its blurred preview with "Photo expired". Needs `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` (server-only) in Vercel.
4. Keys/config: `KLIPY_API_KEY` in Vercel + .env.local; Cloudinary upload preset rule for the chat folder.
