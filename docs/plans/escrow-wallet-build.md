# Escrow wallet build — gasless stakes, automatic payouts (devnet)

Status: **built (2026-09-24)** — phases 1–4 live on devnet; phase 5 (a real two-wallet run) needs a funded test wallet. Escrow: `7XBmYHxvBFe5XTpkoytxFKDbaMqxZrs4qcEjoNHnsfWJ`.

Where it lives: rules `src/lib/settlement/resolve.ts` + `payouts.ts` (tested, `npm test`) · escrow `src/lib/escrow/escrow.ts` · stake actions `src/app/rooms/actions.ts` · browser signing `src/lib/escrow/use-stake.ts` · settlement engine `src/lib/settlement/settle.ts`, run by `/api/cron/settle` (Render worker pings it every minute when `SETTLE_URL` + `CRON_SECRET` are set) and on room view.

## Decisions already made

| | |
| --- | --- |
| Where stakes go | **One Rivaly escrow wallet** (devnet). Per-room on-chain escrow comes before mainnet. |
| Network fees | **Gasless** — the escrow pays every fee. Users only ever hold USDC. |
| Cancelled / postponed match | **Full refund** of every stake. |
| Rivaly's cut | None. Winners split the whole pool, pro rata to stake. |
| Balance | The user's own Dynamic embedded wallet. Rivaly only ever holds money that's staked in an open room. |
| Stakes close | **At kickoff.** |
| Anytime goalscorer | **Hidden** until a lineup feed exists. |
| Wallet confirm screen | **Kept** — the user sees and confirms each stake before it's sent. |
| When rooms resolve | **As soon as the outcome can no longer change** (see *Early resolution*), not only at full time. |

## The one-screen version

```
User taps "Throw down $10 on YES"
  │
  ├─ 1. Server checks everything (match open, limits, market) and BUILDS the transaction:
  │       "move 10 USDC: user wallet → escrow"   fee payer = escrow
  ├─ 2. User's embedded wallet SIGNS it (no SOL needed, one tap)
  ├─ 3. Server checks the signed transaction is exactly what it built,
  │       adds the escrow's fee signature, sends it, waits for confirmation (~1–2 s)
  └─ 4. Only then: room + entry written, with the transaction's signature attached

Match finishes (TxLINE data already in our DB)
  │
  └─ Settlement job: work out YES/NO from the real stats → pay every winner from escrow
       (or refund everyone: cancelled match, or nobody backed the winning side)
       → each payout's signature saved, shown in history with a "Verify on Solana" link
```

## How the pieces work

### 1. Escrow module (server only)
- `ESCROW_SECRET_KEY` (server env var, never in client code) + `NEXT_PUBLIC_ESCROW_ADDRESS` (public). On boot the server derives the address from the key and refuses to run if they don't match.
- One file owns the key: builds stake transactions, co-signs them, sends payouts/refunds. Nothing else imports it.

### 2. Gasless stake (create + join)
- **`prepareStake`** — validates the room/stake exactly as today, then builds the transfer (user's USDC account → escrow's USDC account, exact amount, a memo with a one-time stake ID, fee payer = escrow, fresh blockhash). Saves a `stake_intents` row (who, what room/draft, amount, expires in ~90 s). Returns the unsigned transaction.
- **Client** — the embedded wallet signs it (`getSigner().signTransaction`), after Dynamic's own confirm screen shows the amount and destination (kept on purpose, to prevent mistakes). No SOL needed.
- **`submitStake`** — the server:
  1. checks the signed transaction is **byte-for-byte the one it built** (so nobody can change the amount, destination or make the escrow pay for something else),
  2. adds the escrow's fee signature, sends it, waits for `confirmed`,
  3. in one database transaction: marks the intent used and creates the room + entry (or just the entry) with `stake_tx_signature` (unique — one transfer can never create two entries).
- The escrow only ever signs transactions the server itself built — that's what stops anyone using Rivaly's fee payer to pay for their own transactions. Plus a per-user rate limit.
- **If something breaks mid-way:** chain transfer failed → nothing is written, the user sees a plain-language error and can retry. Transfer succeeded but the database write failed → a recovery job finds the confirmed intent and completes (or refunds) it, idempotently by signature. Money is never lost in the gap.

### 3. When stakes close
- **Stakes close at kickoff.** After kickoff, someone could join "Over 2.5 goals" already knowing it's 2–0. Rooms flip to `live` at kickoff; join/create is refused on-server after that, and the UI shows "Stakes closed — kicked off" instead of the join panel.

### 4. Early resolution

A room resolves the moment its outcome can no longer change — winners get paid mid-match — with one safety rule: a stat can still be reversed after it first appears (VAR disallows a goal or rescinds a red, the feed amends a stat, devnet data is ~60 s sampled). So an early result only settles once **no review is open** (`var` without its `var_end`; NFL `instant_replay` without `instant_replay_end`), **the deciding stat hasn't been discarded or amended** (`action_discarded` / `action_amend`), **and 10 minutes have passed since the deciding moment** (founder's call — configurable; every correction's delay is logged so the window can be tuned with real data). Checkpoint whistles (half-time) settle once no review is open; full time always waits for `game_finalised`.

**Correction after an early payout** (should be very rare): on-chain payouts can't be clawed back, so the first payout stands and Rivaly also pays the side that turned out to be right, from treasury. The cost lands on Rivaly, never on users.

| Market | Early when… | Otherwise |
| --- | --- | --- |
| Over X (goals, corners, points, touchdowns, field goals) | count > X → YES | full time |
| Under X | count > X → NO (under has lost) | full time → under wins |
| Both teams to score | both have scored → YES | full time |
| Red card | first red → YES | full time |
| Half-time result / score, first-half O/U, first-half points | half-time whistle | — |
| Second-half goals Over X | 2H goals > X → YES | full time |
| Exact score (full time) | either team past the called score → NO | full time |
| Goes to overtime (NFL) | end of Q4 → tied YES / not NO | — |
| Winner, winning margin, team points Under | — | full time |
| Cancelled / postponed match | refund, whenever it happens | — |

`resolveMarket(market, match, events)` returns `yes`, `no`, `void` or `pending`, and its tests cover every row above — including a goal that VAR removes inside the 10-minute window (must *not* settle).

### 5. Settlement
- The same `resolveMarket(market, match, events) → yes | no | void | pending` covers all 20+ market types (goals, halves, corners, red card, NFL points/touchdowns/field goals/overtime…), reading the stats the TxLINE ingester already stores. Unit-tested per market type, including edge cases (0–0, overtime, missing HT data → wait, don't guess).
- A job (every minute, alongside the existing TxLINE worker) picks up `live` rooms and asks `resolveMarket` whether they're decided yet — mid-match (per the table above) or at full time:
  - outcome → winners split the pool pro rata; cents floored, leftover cents to the largest winning stake, so every cent is paid;
  - sends payouts from escrow (several per transaction), stores `payout_tx_signature` per entry **before** marking done — re-running the job never pays twice;
  - `cancelled` / `postponed` match, or nobody on the winning side → refund every stake;
  - room → `settled` / `refunded`.
- **Anytime goalscorer** is hidden from the picker until a lineup feed can settle it.

### 6. Trust you can see
- Every stake, payout and refund shows in wallet history with a **"Verify on Solana"** explorer link.
- Room page shows the escrow address and the room's total locked, so anyone can check the chain.
- Reconciliation: escrow USDC vs. sum of open stakes, checked on every settlement run; any gap is logged loudly.
- Legacy rooms from before escrow (no money moved) are marked `cancelled` at cutover — nothing to refund.

## Look & feel — quick, reliable, alive (not black and white)

Every money moment gets a clear state, colour and motion. Loud only where it matters (per the emotion design): the win is the ceiling, everything else is quick and tactile.

| Moment | What the user sees |
| --- | --- |
| **Stake button** | Side colour (YES blue / NO red). On tap: presses in, then shows real progress in three beats — *Confirm in wallet → Locking your stake → Locked* — a ring that fills per real step, never a fake timer. |
| **Early win mid-match** | A goal-moment banner in the room: "Over 2.5 hit — YES wins", payout lands while the match is still on. |
| **Stake locked** | The card settles into its confirmed state, a small USDC coin glides from the stake field into the pool figure, the pool counts up to its new total, a light haptic tick on phones. ~600 ms, never blocks. |
| **Room, live** | Pool and YES/NO split update in real time as rivals join (Supabase realtime): the split bar slides, the pool ticks up, the newest rival's avatar drops into the stack with their side colour. |
| **Stakes closed** | At kickoff the join panel folds into a "Kicked off — stakes locked" strip with the live score. |
| **Win** | The one big moment: full-width result card in green, payout counting up, crests of both teams, "Paid to your wallet · Verify on Solana". Premium, calm — no confetti. |
| **Loss** | Never makes you feel stupid: shows the real result and how close it was, plus a one-tap **Rematch** that pre-fills a new room on the next match. |
| **Refund** | Neutral grey card: "Match cancelled — your $10 is back in your wallet." |
| **Wallet history** | Icons per row — stake (arrow out, side colour), payout (arrow in, green), refund (loop, grey) — pending rows show a small spinning ring until confirmed. |
| **Errors** | One plain sentence and a retry button, in place — never a raw RPC message. |

Motion rules: 150–300 ms for ordinary feedback, ~600 ms for "stake locked", the win reveal the longest; everything respects reduced-motion; no looping animation except real "pending" spinners.

Engagement mechanisms (rivaly-engagement-psychology): **#2 anticipation** (live pool/split, kickoff lock), **#3 goal-euphoria** (win reveal reserved as the one loud beat), **#5 rivalry** (who's on the other side, live), **#10 friction removal** (gasless, no SOL, one tap).

## Build order

| Phase | What | Done when |
| --- | --- | --- |
| **0 — You** | Create escrow wallet, fund with devnet SOL + a little USDC, add the two env vars | Server boots and prints the matching escrow address |
| **1 — Foundations** | Escrow module · `resolveMarket` + tests for every market · migration (`stake_intents`, entry signature columns, kickoff lock) | Tests pass, migration rehearsed in a rolled-back transaction |
| **2 — Gasless stakes** | `prepareStake` / `submitStake`, create + join wired, button states & locked animation | A real devnet stake moves USDC to escrow and creates the entry |
| **3 — Settlement** | Settlement + refund job, payouts, recovery job | A finished devnet match pays winners; re-running pays nothing extra |
| **4 — Live & trust** | Realtime pool/split, win/loss/refund moments, history icons + explorer links, reconciliation | Two wallets can play a full room start to finish |
| **5 — Verify** | End-to-end on devnet with two test wallets, mobile + desktop, reduced motion | Screenshots + transaction links for every step |

Every phase: typecheck, lint, build, devnet test, commit, push. Estimated 2–3 days of agent work, plus your setup time.

## Approved answers

1. Stakes close at kickoff — **yes**.
2. Anytime goalscorer — **hidden** until a lineup feed exists.
3. Dynamic's confirm screen — **kept**, to prevent mistakes.
4. Rooms resolve **as soon as the outcome is locked**, behind a **10-minute** safety window plus the review checks above.
5. A correction after an early payout: **Rivaly pays the correct side too**; users never lose from it.

## Later (not in this build)

- **Tournament-winner rooms** — Premier League champion first (settles from the league table computed from real PL results already in the feed; stakes locked all season, closing date chosen per room). World Cup winner needs a data source with World Cup scores (not in the current TxLINE bundle). Season-long rooms sit outside V1's live-match loop, so they're V2 per the masterplan.
