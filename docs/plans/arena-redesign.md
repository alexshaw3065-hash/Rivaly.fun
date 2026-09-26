# Arena redesign

Status: **built, 2026-09-26 — all three phases.** Founder decisions: football moments are goals and full time only (2026-09-26); keep
Leagues and Leaderboard as separate tabs (the Table merge in §2.6 was declined);
Moment cards cover NFL too (touchdowns, field goals).

What shipped: migration `20260926090000_arena_v2.sql` (posts with photo/GIF,
match tag, moment, calls backed by a real stake, one-level replies;
`arena_reactions`; real leagues with codes; `arena_feed`, `arena_moments`,
`arena_leaderboard`, `league_table`; the `arena` realtime channel) ·
`src/lib/arena/` (typed model + tests, data layer) · `src/components/arena/`
(cards, composer, replies, post page) · rewritten `arena-feed.tsx`,
`arena-leagues.tsx`, `arena-leaderboard.tsx` · real profile Activity/Replies ·
`/arena/p/[postId]` share page. Every sample-data import is gone from the Arena.
Moments de-duplicate the feed's repeat records, fold NFL's separate scoring and
player records into one, and drop anything the feed later discarded (e.g. a
goal VAR took away). Rules checked in a rolled-back transaction: fake calls,
impersonation, outside image URLs and deep replies are all refused.

Follow-up (2026-09-26, migration `20260926120000_arena_quotes_and_moment_context.sql`):
quote any public room in a post (Join YES / Join NO) — calls stay stake-backed
and are the only posts that become receipts; moments carry the score just
before them, and the card says which rooms the moment decided ("Decided 2 rooms
· YES 1 · NO 1"), asked of the same `resolveMarket` rules that settle rooms
(tested in `src/lib/arena/model.test.ts`); "N rooms" opens the match's rooms;
shared posts unfurl with a card (`/arena/p/[postId]/opengraph-image`, a
"CALLED IT" stamp on winning receipts); Arena photos expire after 60 days like
chat photos.

North star: open Rivaly and see straight away what everyone is talking about.
It should feel like a viewing centre just after a big moment, not a comments
page or a database.

## 1. What the Arena is today (audit)

| Part | Real or sample data | Problem |
|---|---|---|
| Feed — posts | **Mixed.** Real posts are shown first, then about 20 made-up posts by sample users (`mock-data.ts` → `buildArenaFeed`) | Users see invented takes from people who don't exist. Breaks "Trust must be visible" and our no-fabricated-data rule. |
| Feed — "Following" | Real follows for real items; a **made-up follow list** for sample items | Same problem |
| Feed — rival entries, hot rooms | Real (sample versions already hidden) | "Hot" just means most people in the room, not what's moving right now |
| Feed — posting | Real. Text only, 280 characters, one 🔥 reaction, no replies | Thin. No photos or GIFs, no link to a match or room |
| "N online" badge | **Made up.** Counts every sample user as online | Invented presence |
| Leagues | **Entirely sample data.** Joining by code only saves to the browser | Nothing real behind it |
| Leaderboard | **Entirely sample data** (made-up winnings and accuracy) | Real ranking functions already exist and power Home (`top_payouts`, `top_streaks`, `top_earners`) |
| Live updates | None. The feed loads once | Doesn't feel alive |

Real database today: 6 profiles, 0 posts, 0 follows, 3 rooms, 4 entries,
0 settled rooms, 0 chat messages — but **668 matches and 11,264 match
events** (goals, VAR, red cards, full time, NFL touchdowns).

**What this means:** with the sample data removed, the Arena is nearly empty
until real people post. The design has to solve that empty start honestly,
and real football is the answer: match moments happen every weekend whether
or not anyone has posted yet.

## 2. The redesign

### 2.1 The match moment drives the feed

The Arena is built around **football moments, not posts.** When a goal, red
card, VAR check, penalty or full-time whistle happens in a covered match, a
**Moment** card goes to the top of the feed:

- The event, minute, score and both crests
- Which open rooms it just swung ("3 rooms just flipped to YES")
- Reactions and takes from people, attached to that moment

Takes and reactions stack up under the moment, so the feed reads like the
match unfolding socially. A **Live now** row of match chips sits above the
feed; tap one and the feed shows only that match. Everyone looking at the
same thing is the viewing-centre feeling.

This is "loud where it matters": only goals, reds, VAR, penalties and full
time become Moments. Shots and corners never do.

### 2.2 Card types (all real, no sample data)

| Card | What it is | Its one action |
|---|---|---|
| **Moment** | A big match event (from `match_events`) | React / add a take |
| **Take** | A post: text plus an optional photo or GIF (same pipeline as chat), optionally tagged to a match | React / reply |
| **Call** | A take attached to a room: "I'm backing YES", showing the stake and pool | **Fade it** (take the other side, one tap into the room) or **Back it** |
| **Receipt** | When a room settles, the original call comes back: "@tunde called it 3 days ago", with the result. Losers see how close it was and a rematch button | Share / Rematch |
| **Room heating up** | Rooms with real new entries in the last 30 minutes (not just the most people ever) | Enter room |

"Fade it" is the key interaction. It turns someone's opinion into a direct,
named challenge in one tap — the rivalry the product is named for.

### 2.3 Reactions and replies

- Replace the single 🔥 with a small football set: 🔥 😂 🎯 🤡 🧢 (cap — "you don't believe that")
- Replies go one level deep only (no endless threads)
- Your own reactions show instantly, like chat

### 2.4 Presence and live updates

- Real presence on one Arena channel. "N here now" only shows when the real number is 3 or more; otherwise it's hidden. No invented counts.
- New items arrive live. They don't push the feed around; a "4 new takes · 1 goal" pill appears at the top instead.
- The feed still ends: "You're caught up" stays. No endless loop.

### 2.5 Posting

- Collapsed to one line at the top: "What's your call?"
- Tap to open a sheet: text (500 characters), a photo or GIF, tag a match, attach a room (which makes it a Call)
- The floating button on the Arena posts a take (on Rooms it still creates a room). One primary action per screen.

### 2.6 Tabs: fold Leagues and Leaderboard into one "Table"

Leagues and Leaderboard are both standings. Football fans already know what
that is: **the table.** Proposed tabs:

- **Feed**
- **Table** — Global · Following · then each of your leagues. Filter: this gameweek / all-time / accuracy / streak.

That's two tabs instead of three, and the rival you know ("people you
follow") sits next to the global list.

Every number on the Table comes from settled rooms. Until rooms settle, it
shows an honest empty state ("The table fills in when the first rooms
settle") instead of made-up rankings.

### 2.7 Leagues for real (points only, as V1 scope already says)

- Tables: `leagues` (name, invite code, creator), `league_members`
- Points come from settled entries: a win is 3 points; beating long odds (a small side of the pool) earns a bonus point. Gameweeks follow the EPL fixture weeks.
- Join by code, leave in one tap. No money, ever (money would make it a Tournament, which stays out of V1).

## 3. Engineering

- **One feed query:** a `arena_feed(scope, match_id, cursor)` database function that unions posts, public entries, settled results and big match events. It returns one typed list, paged by (time, id), with no client-side merging of sources.
- **Types:** one TypeScript union type `ArenaItem`, with one kind per card and exhaustive switches.
- **Remove every `mock-data` import** from Arena, the online badge, Leagues and the Leaderboard.
- **Realtime:** one `arena` channel for presence plus new-item broadcasts. The database stays the record, the same broadcast-first pattern as chat.
- **Media:** reuse the chat photo/GIF pipeline (Cloudinary + Klipy) and its database checks.
- **Tests:** the paging cursor, moment selection (which events count), league points and receipt linking.

## 4. Engagement mechanisms used

Named per the house rule, from the engagement-psychology skill:

- **#1 Variable reward** — a mixed real feed (moment, take, receipt, call)
- **#2 Anticipation** — live match chips; rooms flipping on a goal
- **#3 Rare big moments** — only true match events get the loud card
- **#4 Collective effervescence** — reactions stacking on a moment in real time
- **#5 Rivalry** — Fade it, named calls, a "Following" table
- **#7 Investment** — receipts: your history keeps paying off
- **#9 Social proof and FOMO** — real counts only

Guardrails: no fake presence or counts, the feed ends, no streak-shaming, and
losing always shows the close call and a rematch.

## 5. Phases

1. **Trust fix + real foundation (small):** remove all sample data from the Arena. Table on the real ranking functions. Real presence (hidden under 3). Honest empty states. Merge the tabs into Feed / Table.
2. **The pulse:** Moment cards from match events, Live now chips, takes with photos/GIFs and a match tag, the new reactions and one-level replies, the live "new items" pill, Fade it / Back it.
3. **Receipts and leagues:** link calls to rooms, receipts when rooms settle, shareable receipt card, real leagues (tables, codes, gameweek points).

## 6. Decisions for the founder

1. Fold Leagues and Leaderboard into one **Table** tab? (Recommended.)
2. Moment cards for NFL too (touchdowns, field goals), or football only for now?
3. Start with Phase 1 now? It's small and fixes the made-up data problem.
