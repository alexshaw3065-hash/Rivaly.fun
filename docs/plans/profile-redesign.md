# Profile — audit and redesign plan (not built)

Status: **partly built, 2026-09-26.** Built first (founder's call): **You vs
them** and the **Rivaly card** rebuilt on real data (migration
`20260926220000_player_card_and_head_to_head.sql`):
- `player_card(user)`: six attributes (ACC accuracy, FRM last-5 form, STR
  streak, EXP rooms played, WIN profit percentile, FAN followers), an overall
  rating from 3 settled public rooms ("NR" before), fixed tiers (gold 75+,
  silver 60+, bronze below). The card is one server-made PNG
  (`/profile/[username]/card`, gold/silver/bronze art in `public/card-*.png`)
  so it never loads text-then-image; Share sends that file.
- `head_to_head(other)`: settled rooms you both entered on opposite sides,
  the last meeting, rooms live between you, a rematch fixture.
- The profile's stat tiles now read the real record (Record · Accuracy ·
  Winnings); the sample-data Rivaly Score and the wrong tab counts are gone.
**Trust fix phase: built, 2026-09-26** (migration
`20260926240000_profile_trust_fix.sql`). Wallet block and achievements kept
where they are, only their wrong parts fixed:
- Profiles are real accounts only (no sample-user fallback: `@victorj` now
  says "Rival not found").
- Form guide (last 5) and Leaderboard rank under the record tiles; the rank
  opens `/arena?tab=leaderboard`.
- Achievements read the real record (wins, accuracy from 3+ settled rooms,
  net winnings, rooms entered) — and the winnings goals no longer compare
  cents to dollars.
- Wallet block: "No positions yet" only when that's true.
- Banner and ring colours are saved to the account; a refused profile save
  shows an error with Try again instead of failing silently.
- `/invite`: the invented code and "7 joined" are gone — it shares your real
  profile link.
- Follow while signed out opens the sign-in sheet, like the rest of the app.
- App-wide: room-card countdowns used the old sample matches as "now" (a
  played match showed "39d 5h") — they use the real clock; Yes/No only show
  on rooms still taking stakes.

Still proposed: the rest of the layout (Calls tab, compact Rooms tab,
followers lists, targeted Challenge, share image for the profile).

What a Rivaly profile is for: **who is this person as a predictor, and how
do I stack up against them?** Identity, a record you can trust, and a reason
to challenge them. Not a wallet screen and not a settings page.

## 1. Audit — every element and every tap, today

### Header (banner area)
| Element | What happens on tap | Problem |
|---|---|---|
| Banner (flat colour) | Nothing | Colour picked in Edit is **not saved** — gone on reload |
| Share icon | Copies the URL, no feedback beyond the tooltip changing | No share sheet, no preview card for the profile |
| **Follow** (others) | Follows / unfollows (real, instant) | Signed out it jumps to `/login` — everywhere else uses the sign-in sheet |
| **Challenge** (others) | Opens a blank Create Room | Nothing about *this person* — they're not invited, not named |
| Settings icon (self) | Sheet: light mode, member since, sign out | Fine, but sits on the banner like a public action |
| Gift icon (self) | Opens `/invite` | **`/invite` is fake**: hard-coded code `RIVAL-VJ2026`, a made-up "7 joined", and Copy doesn't copy |

### Identity block
| Element | Tap | Problem |
|---|---|---|
| Avatar | Nothing (self: nothing either) | Shows a letter ("D") while the rest of the app shows the drawn rival character — two identities |
| Name + pencil (self) | Opens Edit sheet | Edit saves **on close**, silently; a failed save is swallowed |
| `@username` | Nothing | — |
| **Rivaly Score badge** | Opens a gold/silver/bronze card | **Ranked against the old sample roster**, not real users; PNL, volume, rooms, win rate always 0. Real users get meaningless numbers like "1 · Bronze" |
| "0 rivals · 0 following · 1 rooms" | Nothing | Counts can't be opened — no follower/following lists. "Rivals" means followers, which is confusing on an app about rivals |
| Bio / "+ Add a bio" | Opens Edit | Fine |
| Social icons / + | Open link or copy handle / add sheet | Fine |
| Achievements preview | First time: intro sheet; then full sheet | Accuracy badges read a column that is **never updated**; "First win", "In the Arena" etc. can **never unlock** (wins are hard-coded to 0); daily streak lives in the browser, not the account |

### Stats row
| Tile | Problem |
|---|---|
| Accuracy 0% | `prediction_accuracy` column is **never written** — always 0% |
| Total winnings $0 | `total_winnings_cents` is **never written** — always $0 |
| Rooms created | Real |

### Own wallet block (self only)
Live USDC balance (real), a **decorative dashed wave** and a hard-coded **"No
positions yet"** (shown even when you have positions), then Deposit/Withdraw.
It's a wallet screen inside a public identity page.

### Tabs
| Tab | Content | Problem |
|---|---|---|
| Position (n) + Open/Closed | Full room cards for rooms created or joined (real) | Big cards with Yes/No buttons even when stakes are closed; the room card's countdown showed "39d 5h" on a match already played (a room-card bug to fix separately) |
| Replies (n) | Real replies | The **count is wrong** — it reads the old sample data, so always "(0)" |
| Activity (n) | Real top-level posts | Same wrong "(0)" count |

Nothing on the profile shows the thing that matters most: **their calls and
how those calls went** (receipts), their form, or your record against them.

## 2. What's real vs not (summary)

Real: follow, followers/following/rooms counts, bio, socials, avatar upload,
positions list, replies/posts lists, live balance, theme, sign out.

Not real or broken: Rivaly Score, Accuracy, Total winnings, most
achievements, tab counts, banner/ring colour, the "No positions yet" line,
the `/invite` page, the device-only daily streak.

## 3. Redesign

### Layout, top to bottom
1. **Header** — the drawn rival character (or their photo), name, @handle,
   bio, socials. One primary action on the right:
   - someone else: **Challenge** (primary) + **Follow** (secondary)
   - you: **Edit profile** + Share
   Banner stays a colour, but saved to the account.
2. **Form guide** — last 5 settled results as football form: **W W L W D**
   (D = refunded/void). The most football-native way to show "how good is
   this person lately", readable in one second.
3. **The record** — four real numbers from settled rooms (the same data as the
   Leaderboard): **Record** (e.g. 14–9), **Accuracy**, **Winnings**,
   **Streak** — plus their **Leaderboard rank** ("#12 this month") linking
   to the board.
4. **You vs them** (someone else's profile, signed in) — head-to-head from
   rooms you were both in on opposite sides: **"You 3 – 2 Kofi"**, the last
   meeting, and **Rematch**. The strongest rivalry hook the product has.
5. **Tabs**
   - **Calls** — their calls and receipts (called it / missed), newest
     first. The track record. Default tab.
   - **Posts** — takes, quotes and moment posts (X-style cards, as in the
     Arena).
   - **Replies**
   - **Rooms** — open and settled rooms as compact rows (claim · side ·
     stake · result), not full room cards.
   Counts come from the real data.
6. **Achievements** — a small row under the header, only badges backed by
   real data (first room, first join, first win, 10 wins, streaks, accuracy
   tiers from settled rooms, followers). Honest progress bars.

### Taps
- **Followers / Following** open lists (with Follow buttons).
- **Challenge** opens a sheet: pick a match → pick a market → the room is
  created and a share link names them ("@you challenged @kofi"), or it
  drops into Create Room pre-filled. (No DM system exists, so "inviting"
  means a link, not a notification — until notifications are built.)
- **Form guide** letters and **Calls** open the room / receipt.
- **Rank** opens the Leaderboard on that metric/period.
- **Share** uses the phone's share sheet with a profile card image (name,
  form, record) — like the receipt card.
- **Edit profile** gets an explicit **Save** with a visible error if it fails.

### What moves out
- **Wallet block** → Wallet page. On your own profile, a single line
  "Balance $42.10 · Wallet" at most.
- **Rivaly Score** → removed until it can be computed from real results
  (form + record + rank already say it honestly). Or rebuild it on real data
  later.
- **Settings / Invite icons off the banner** → a ⋯ menu next to Edit
  (settings, sign out); Invite rebuilt as a real "share your profile link" or
  removed until referrals exist.
- **Ring colour picker** → removed (the drawn character is the identity).

### Engagement mechanisms (house rule)
#5 rivalry (You vs them, Challenge, Rematch), #7 investment (record,
form, receipts wall, achievements), #6 loss aversion (streak), #9 social
proof (rank, followers) — all real numbers only.

## 4. Data work needed
- `profile_stats(user)` from settled rooms: record, accuracy, winnings,
  current streak, last 5 results, rank per metric/period (reuse
  `arena_results()` / `arena_leaderboard()`).
- `head_to_head(viewer, other)`: rooms both entered on opposite sides.
- Calls tab: posts with a room + receipt status (reuse the feed's receipt
  logic).
- Persist banner colour (`profiles.banner_color`), or drop it.
- Real achievements predicates from settled results; server-side streak.
- Fix: tab counts, remove the fake "No positions yet", `/invite`, Rivaly
  Score.

## 5. Phases
1. **Trust fix** — remove/replace everything fake (Score, the dead stat tiles,
   wrong counts, "No positions yet", `/invite`), real stats + form guide.
2. **Rivalry** — You vs them, targeted Challenge, followers/following lists.
3. **Record** — Calls tab with receipts, compact Rooms tab, real
   achievements, share card.

## 6. Decisions for the founder
1. Show **Winnings** publicly on everyone's profile (the Leaderboard already
   does), or only on your own?
2. **Rivaly Score**: remove for now, or rebuild on real data?
3. **Invite**: remove until referrals are real, or turn it into "share your
   profile"?
4. **Banner colour**: keep (saved to the account) or drop?
