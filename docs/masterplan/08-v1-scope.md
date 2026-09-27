# V1 Scope — Be Ruthless

Pump.fun's V1 was shockingly simple. That's one of the biggest lessons from its success. People today look at Pump.fun — profiles, trending pages, comments, advanced charts, livestreams, creator pages — and forget none of that existed initially.

## Pump.fun V1, for reference

1. **Create Token ⭐** — the core feature. Enter token name, ticker, image, description. Click Create. Done. No complicated setup.
2. **Token Page** — name, chart, buy, sell, holders, comments. That's it.
3. **Buy** — amount, then buy.
4. **Sell** — same.
5. **Bonding Curve** — the magic. Users didn't even need to understand it, they just saw price ↑ or price ↓.
6. **Comments** — very basic, no sophisticated community features, just people talking.
7. **Trending** — huge feature; people discovered new tokens.
8. **Search** — search token.

**Things V1 did NOT have:** Following, Friends, Profiles worth caring about, Livestreams, Notifications, Messaging, Communities, Groups, Creator economy, Tournaments, Advanced analytics, Fancy dashboards, Reputation systems, Leaderboards (at first).

**Why it worked:** it solved exactly one problem — "I want to launch a token in under a minute." Everything else was secondary.

## Rivaly's Equivalent

Ask: what's our one thing? It's this:

> **"I want to put my football opinion up against someone else's in under 30 seconds."**

That's Rivaly's "create token."

## Rivaly V1 — Ship Only

- ✅ **Home** — Live matches, trending rooms.
- ✅ **Room** — the heart of the product: chat, pool, predictions, join, leave, settlement.
- ✅ **Create Room** — fast.
- ✅ **Search** — rooms, matches, users.
- ✅ **Profile** — minimal: history, followers, accuracy.
- ✅ **Wallet** — deposit, withdraw, balance.
- ✅ **Arena** (2026-08-20 revision, supersedes the earlier "Following" line) —
  the fourth nav tab. Feed (Global/Following social feed — win/loss cards,
  hot-room alerts, rival activity, banter/thesis posts), Leagues
  (points-only, FPL-style: standings, gameweek cadence, join by code — see
  §7 below for why this is scoped separately from Tournaments), and a full
  Leaderboard (§4.12). Still the same core network effect the old
  "Following" line was protecting — people following creators and friends —
  just built out into the real social/engagement layer the product needs to
  bring people back daily, per the founder's explicit direction and the
  research behind it (see the Arena implementation plan).

## Leave Out of V1

❌ Communities · ❌ Club/team fan groups (e.g. "Arsenal Fans") · ❌ Tribes/
Clans (group trading, copy-trading, shared audience-building — see §7
below) · ❌ Shortcuts · ❌ Voice chat · ❌ Streaming · ❌ Money-entry
Tournaments (real entry fees, prize pools) · ❌ AI · ❌ Complex achievements
· ❌ Creator monetization beyond host earnings — *revised 2026-09-27: the founder brought fees + host earnings into V1 (5% of winners' profit: 3% Rivaly, 2% the host; private by default). Verified creators, featured rooms, subscriptions, tipping and paid entry remain out.*

### §7 — Leagues vs. Tournaments (2026-08-20 clarification)

Arena's Leagues shipped in V1 despite Tournaments being excluded above,
because they're not the same thing: Leagues here are **points-only** — no
entry fee, no prize pool, just standings and bragging rights, same shape as
Fantasy Premier League's free-to-play core game. Real-money entry/prize
pools (what "Tournaments" actually meant in this list) stay excluded. This
distinction matters for future scope decisions: adding money to Leagues
later is a Tournaments-scope change, not a Leagues one.

Tribes/Clans were scoped for this pass and explicitly cut, deferred to V2.
The founder's fuller vision for it — closer to FOMO app's Clans than a
simple group: one-tap trade mirroring off a live feed card, a "thesis" tab
showing a poster's reasoning *and* their verified P&L before you commit,
clans built around a few top/whale predictors that smaller users can watch
and follow into rooms — is preserved in
[07-product-blueprint.md](07-product-blueprint.md)'s V2 section rather than
lost.

## The Lesson From Pump.fun's Loop

Pump.fun didn't go viral because of features — it went viral because of a loop:

```
Create Token → People Buy → Price Moves → People Share
→ More Buyers → Trending → Repeat
```

## Rivaly's Loop

```
Create Room → Challenge Friends → People Join → Live Match
→ Chat Explodes → Winner Gets Paid → Screenshots → People Share
→ New Users → More Rooms
```

That's the engine. Everything else is supporting it. See [05-growth.md](05-growth.md) for the full growth philosophy behind this loop.

## The Framing Difference

Rivaly should be even more opinionated than Pump.fun was.

- Pump.fun asked: *"What token do you want to create?"*
- Rivaly should ask: **"Who are you challenging?"**

That question immediately makes the experience social. It shifts the focus away from "using an app" and toward starting a rivalry.

If V1 nails that feeling, the foundation is built. Everything else — communities, tournaments, livestreams, creator tools — can come later without changing the core experience.
