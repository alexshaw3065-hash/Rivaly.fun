# Colosseum — Crypto World's Fair (Solana track)

Everything for Rivaly's submission in one place. Facts and lines come from [10-positioning-and-pitch.md](../masterplan/10-positioning-and-pitch.md); don't re-derive them here.

## The facts

- **Deadline:** Monday 12 Oct 2026, 11:59pm Pacific = **Tuesday 13 Oct, 07:59 West Africa / UK time**. Aim to submit by Sunday night.
- **Register:** every team member signs up on colosseum.com before the deadline. The team leader uploads the submission.
- **Prizes:** $30k grand prize, $15k each for the next 20, $10k each for 10 Solana-track winners, plus the accelerator ($250k pre-seed). Winners announced around 5 Dec.
- **Existing projects are allowed.** Nothing in the rules requires code started during the contest (14 Sep). Be open that Rivaly started on 9 Aug and show what was built during the contest.
- **What to submit:** name, one-liner, description, tracks/tools, team with backgrounds, location, logo, GitHub link, **pitch video (max 3 min)**, **technical demo video (2–3 min)**.

## How judges score, and our answer

| Criterion | What they ask | Our answer | Gap |
|---|---|---|---|
| Functionality | Does it work? Code quality? | Live beta, real matches, automatic settlement, 165 tests, typed, RLS on every table | — |
| Potential impact | Market size, effect on crypto | Sports betting is huge and social; crypto invisible = mainstream users on Solana without knowing it | Keep claims to sourced numbers |
| Novelty | How unique? | Not first (say so). The combination is rarer: pools not just 1v1, a live room, hosts earn, invisible crypto | Crowded category (see below) |
| UX | Blockchain → great UX? | Email sign-in, embedded wallet, no SOL, gasless staking, payouts in seconds, on-chain receipts | — |
| Open-source | Open source? Composes with others? | Code is public | **README says "not licensed for reuse". Pick a licence (decision for the founder).** |
| Business plan | Viable business, team? | 5% of winners' profit (3% Rivaly / 2% host); creators bring rivals | Say what's next: mainnet, local payments, licence |

## The competition in Colosseum's own history

Colosseum's database has ~176 past projects in "Solana competitive wagering and betting". Most didn't place. Ones that did:
- **Pregame** (Radar) — 1st Consumer, $30k + accelerator: peer-to-peer wagering.
- **Fora** (Cypherpunk) — 3rd Consumer: group-chat prediction.
- **Trepa** (Breakout) — 1st Consumer + accelerator: mobile sentiment predictions.
- **Poll – Bet With Friends** (Breakout) — honourable mention: iMessage betting with friends.

**What this means:** "bet with friends on Solana" alone won't stand out. What separates Rivaly, and what the videos must *show*, not say:
1. **It's live with real users**, not a demo: real rooms, real matches, settled automatically.
2. **The room is a place to watch together**: live score, timeline, chat, the stadium race.
3. **Nobody touches crypto**: email in, staked, paid, never saw a wallet.
4. **Hosts earn**, so the people who bring rivals grow it.

## Traction (true numbers, 7 Oct)

Use these, rounded; update the day you submit.
- 24 accounts, 17 of them in the last 7 days
- 13 people have staked; 61 stakes in 26 rooms
- 17 rooms had two or more people in them
- 5 rooms settled and paid automatically from live data, 4 refunded automatically
- 11 Arena posts, 20 follows

**Don't** quote the stake volume: it's devnet test USDC, mostly from testing, and judges will discount it. **Do** quote one real line from a user if you have one (a message, a tweet, "my mate and I settled our Arsenal argument"). Judges explicitly look for user feedback.

## Submission form text

**Name:** Rivaly

**One-liner:** Social prediction for sport: make a call on a match, people back it or take the other side, and the winners are paid automatically.

**Description:**
> Sports betting is already social: people argue about matches with friends on WhatsApp, Telegram and X, then place their bets alone with sportsbooks that profit when they lose. Rivaly is social prediction for sport. Anyone creates a prediction on a match, others back it or take the other side, and everyone watches together in a live room with the score, the big moments and a chat. When the official result is in, the pot is split among the winners automatically, in USDC on Solana, usually within seconds. Rivaly never takes a side; it charges only on winnings, and the host who brought everyone earns a share. Sign-in is email or Google, with a Solana wallet created behind the scenes, so users never need SOL or a crypto app. Live beta on devnet at rivaly.fun with football (Premier League, Champions League, top European leagues, MLS) and the NFL.

**Tracks:** Solana. Category: Consumer.

**Tools:** Solana, USDC (SPL token), Dynamic embedded wallets, Helius RPC, Supabase, Next.js, TxLINE and Big Balls Data (live sports data).

**Links:** rivaly.fun · github.com/alexshaw3065-hash/Rivaly.fun · x.com/Rivaly_fun

**Team:** *(founder fills in: name, role, one line of background each)*

## Pitch video — script (2:50)

Record your face for the opening and the close; screen-record the app in between. Plain, warm, no music under the voice. ~380 words.

**0:00–0:20 — Who and why**
> "I'm [name], founder of Rivaly. Every weekend I argue with my mates about football — who wins, who scores. And every time, the bet happens somewhere else: alone, on an app, against a company that wins when we lose."

**0:20–0:45 — The problem**
> "Predicting sport has always been social: the group chat, the office pool, the 'bet you' before kickoff. Sportsbooks made it you against the house. Prediction markets made it a price on a screen. And betting with friends breaks down — someone holds the cash, someone doesn't pay, and you argue about the result."

**0:45–1:45 — Rivaly (show the app, don't describe it)**
> "Rivaly is social prediction for sport. I pick a match, make a call — 'Arsenal to win' — and share the link. My friend takes the other side. Anyone else can join either side."

*Show: create a room in ~10 seconds → the share sheet → someone joining NO.*

> "Then we watch it together: live score, the big moments, the chat, and the stadium shifts as the game swings."

*Show: a live room — score, a goal moment, chat.*

> "When the result's in, the winners are paid automatically, in seconds. Rivaly never takes a side; we only take a small fee on winnings, and the person who hosted the room earns a share."

*Show: the settled result screen and the payout.*

**1:45–2:10 — Why Solana, invisible**
> "Under the hood, every stake and payout is USDC on Solana with a public receipt. But nobody here signed up with a wallet. It's email or Google; a wallet is made for you, we pay the network fee, and winners are paid in seconds. That's only practical on Solana."

**2:10–2:35 — Traction and feedback**
> "Rivaly is live in beta. In the last few weeks, [N] people have joined, [N] have staked in [N] rooms, and rooms have settled and paid out automatically from live match data. [One real line of user feedback.]"

**2:35–2:50 — Vision and close**
> "Fans already predict sport together. Rivaly gives them a place to do it — with the people they know, watching together, settled fairly. Next: mainnet and local payments. Rivaly. Settle it on Rivaly."

The 44-second friend film can replace the 0:45–1:45 app section if it shows the same steps; keep the voice-over.

## Technical demo — script (2:40)

Screen recording with your voice. This one is about *how* and *why*, not selling.

1. **Architecture (0:00–0:30).** One diagram: Next.js on Vercel → Supabase (Postgres, RLS, Realtime) → Solana (USDC escrow) ← worker on Render reading TxLINE and Big Balls Data.
2. **Sign-in and wallets (0:30–0:55).** Dynamic: email sign-in creates an embedded Solana wallet. Why: mainstream users never manage keys or hold SOL.
3. **Staking (0:55–1:30).** Join a room → the server builds the USDC transfer to escrow, Rivaly pays the fee, the user signs silently → the server checks the transfer on-chain before the stake counts. Open the transaction on Solana Explorer.
4. **Settlement (1:30–2:10).** The worker writes live events; `resolveMarket` decides each market from official data; a 10-minute safety window for VAR; the pot is split pro rata minus the 5%-of-profit fee; payouts sent and recorded. Open a payout on Explorer. Mention: twin-record check (two data records disagree → no payout until resolved), $1 floor enforced by app, server and database.
5. **Why custodial escrow for V1, honestly (2:10–2:40).** "V1 holds stakes in a Rivaly escrow wallet: every move is public on-chain, and it let us ship automatic settlement from live sports data fast. The next step is an on-chain escrow program, so the rules hold the money, not us."

## What's left before Sunday

- [ ] Founder: register on colosseum.com (each team member).
- [ ] Founder: decide the licence (see below).
- [ ] Founder: one or two real user quotes.
- [ ] Record the pitch video (face + screen).
- [ ] Record the technical demo.
- [ ] Logo file for the form (the app icon).
- [ ] Fill team section; submit by Sunday 11 Oct.
