# Match data providers — limits, timing and how we stay under them

Status (2026-09-27): **founder chose Big Balls only** — no API-Football, no football-data.org ("so confusion doesn't arise"). Built and pushed:
`src/lib/bigballs/` (client, pure logic + tests, sync), the Render worker loop, `/api/cron/sync-bigballs`.

What that changes from the plan below:
- **No second opinion on payouts.** Instead, full time is trusted only once Big Balls has reported the same finished score for 5 minutes (`confirmFinal`), a goal taken back writes `action_discarded` (restarting any early-lock safety window), and the planned admin page is the human check.
- **Schedules come from Big Balls too**: fixtures every 6 hours, one call per league (6 leagues ≈ 24 calls/day).
- **No friendlies**: Big Balls doesn't offer them (its football leagues: epl, laliga, seriea, bundesliga, ligue1, ucl, mls, wc2026). EPL stays on TxLINE.
- Leagues are in `tracked_competitions` (provider `bigballs`, ids 900001–900006) with `scores_available = false` until the Render worker is confirmed polling — flip to true to offer them in Create Room.

The API-Football / football-data.org sections below are kept for reference only.

## Who does what

| Provider | Covers | Role | Why |
|---|---|---|---|
| **TxLINE** (have it) | Premier League, NFL | Live + settlement | Push stream, deepest data, on-chain proof. No per-request budget. |
| **Big Balls** | UCL, La Liga, Bundesliga, Serie A, Ligue 1, MLS, friendlies | **Live scores** (primary) | Only free source with live scores for all of them. |
| **API-Football** | same leagues | **Referee**: confirms final scores before payout; backup live source | Independent second opinion; can check up to 20 matches in one call. |
| **football-data.org** | UCL + top 5 (not MLS/friendlies) | **Schedules**: fixtures, kickoff changes, postponements; third opinion on finals | No daily cap, so it carries the slow, repeated work for free. |

## The limits

| | Per day | Per minute | Resets | Live on free? | Watch out |
|---|---|---|---|---|---|
| Big Balls (free, GitHub sign-up) | **500** | 100 | 00:00 UTC | Yes — scores + goals | Cards/corners/VAR only in a post-match box score (~30 min after FT). It's an aggregator of free sources + scrapers, with a confidence score per answer. **4xx breaker**: 500 client errors in an hour (or 80% errors after 200 calls) → every call refused for 10 min. 4xx and 429s count against quota. Football needs `?league=` on `/v1/matches`; `/v1/scores` takes `?sport=` — to verify whether one call covers every live football match. |
| API-Football (free) | **100** | 10 | 00:00 UTC | Yes | Free plan limits seasons — **must confirm it serves the current season** (first call we make). If not: Pro $19/mo = 7,500/day. |
| football-data.org (free) | none | **10** | rolling minute | **No** — scores delayed | 12 competitions; no MLS/friendlies; no lineups/events. €12/mo adds live scores. |
| TxLINE | — | — | — | Push stream | Reconnect = snapshot backfill (already built). |

Paid ceilings if we outgrow free: Big Balls Solo $19/mo = 10,000/day (300/min). API-Football Pro $19/mo = 7,500/day.

## The rules that keep us under

1. **One server process asks; nobody else does.** Only the Render worker calls providers. It writes to Supabase; every phone reads from Supabase over Realtime. 10 viewers or 10,000 — same number of API calls.
2. **Silence until kickoff.** Fixtures are pulled once a day (football-data for UCL/top 5, Big Balls for MLS/friendlies) and kickoff times are stored. Zero calls while waiting.
3. **Only matches with money on them are polled live.** A match with no room gets its final score from the next daily pull — nothing live.
4. **One call covers every live match** where the provider allows it: API-Football `/fixtures?live=all` (or `?ids=` up to 20), Big Balls `/v1/scores?sport=football` if it covers all leagues (verify); otherwise one call per league *that has a live room*.
5. **Pause at half-time.** ~15 minutes of no calls per match window.
6. **Adaptive cadence** (Big Balls live ticks):
   - 60s normal
   - 45s in the last 15 minutes, or when one goal would decide a room
   - 120s in a blowout where no room can still change
   - stretched further by the budget governor if the day's allowance is running short
7. **Goals from score changes.** A score change on the live tick is the goal. The goal-scorer event call (free on Big Balls) is made once per goal, only for matches with rooms.
8. **Fixed facts are saved once**: teams, competition, venue, kickoff. Line-ups: one call ~30 min before kickoff (also re-confirms the time). Box score: one call after full time.
9. **Late starts**: at scheduled kickoff, if the match isn't live yet, check every 3 min; after 45 min, ask football-data whether it was postponed. A postponed match is never polled again and its rooms go to void/refund.
10. **Budget governor.** Every response's rate-limit headers (`X-RateLimit-Remaining` on Big Balls, `x-ratelimit-requests-remaining` on API-Football) are stored in a `provider_usage` table — the provider's own count, not our guess. Calls are ranked:
    - **P0 settlement** — confirm a final or an early lock. Reserved: 40/day on each provider, never spent on anything else.
    - **P1 live** — ticks for matches with money in rooms.
    - **P2 extras** — line-ups, box scores, scorer names.
    When spare budget drops, P2 stops first, then P1's cadence stretches (60 → 120 → 300s) so the remaining calls last until the day's last final whistle. P0 is never touched.
11. **Never trip the breaker.** Build every request from validated inputs; never retry a 4xx; honour `Retry-After`; back off exponentially on 5xx; stop a provider for the day on a quota 429.
12. **Map fixtures once.** Each provider numbers matches differently. A `match_sources` table maps one Rivaly match to each provider's id, matched once by normalised team names + kickoff (±2h), with a team-alias list ("Man Utd" = "Manchester United"). Anything unmatched is logged, never guessed.

## Payouts on these leagues (the trust rule)

Big Balls is an aggregator, so it never settles a room alone.

- **Full time**: Big Balls says finished → one API-Football call confirms every just-finished match at once (`?ids=`, up to 20). Scores agree → settle. Disagree → hold, re-check every 10 min. Still split after 6 hours → football-data.org's (delayed) result is the tie-break. No two sources agreeing → flagged for review on the admin page.
- **Early locks** (e.g. Over 2.5 after the 3rd goal): API-Football must confirm the score before the lock starts its 10-minute safety window.
- **Markets**: goal-based only at first (result, over/under goals, both teams to score, correct score, half-time result). Corners and cards are hidden for these leagues until we pay for live stats — the free data only has them after full time.

## Budget on real days (Big Balls, 60s cadence)

| Day | Live minutes with a room | Live calls | + fixtures, line-ups, scorers, box scores | Total / 500 |
|---|---|---|---|---|
| Quiet midweek (1 window) | ~90 | ~90 | ~25 | ~115 ✅ |
| UCL night (2 windows) | ~180 | ~200 | ~40 | ~240 ✅ |
| Big Saturday (4 windows) | ~360 | ~380 | ~60 | ~440 ⚠️ tight — governor stretches to 75–90s late in the day |
| Saturday, per-league calls needed (no bulk) | ~360 × leagues live at once | 700–1,400 | — | ❌ → upgrade trigger |

API-Football (100/day): ~10 fixture-mapping calls, ~20–40 final confirmations (batched 20 per call), the rest held for backup live duty at 5-minute cadence if Big Balls fails.

## When to pay

Upgrade Big Balls to Solo ($19/mo, 10,000/day → 30s cadence all day) when **any** of these happens:
- `/v1/scores` can't cover all leagues in one call and we have rooms in 2+ leagues at once on a regular basis;
- the governor stretches cadence past 90s on 3+ match days in a week;
- a payout waits more than 15 minutes for a confirmation because the budget ran dry.

API-Football Pro ($19/mo) immediately if the free plan doesn't serve the current season.

## Build order (once keys are in)

1. Day-one checks (≈5 calls): Big Balls `/v1/usage`, `/v1/leagues`, `/v1/scores?sport=football`; API-Football `/status` and `/fixtures?live=all` (current-season access).
2. `provider_usage` + `match_sources` tables; the budget governor.
3. Daily fixtures (football-data + Big Balls for MLS/friendlies) → matches, mapped across providers.
4. Kickoff scheduler + live ticks on the Render worker.
5. Settlement agreement rule (shown to the founder before it's switched on — it moves money).
6. Turn the leagues on in `tracked_competitions`; goal-only markets for them in Create Room.

## Keys the founder adds (Vercel, `.env.local`, Render)

`BIGBALLS_API_KEY` (sign up with GitHub for 500/day) · `API_FOOTBALL_KEY` · `FOOTBALL_DATA_KEY`
