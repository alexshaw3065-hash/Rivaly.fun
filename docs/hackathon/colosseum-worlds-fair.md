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
| Functionality | Does it work? Code quality? | Live beta, real matches, automatic settlement; ~170 app tests + 45 program tests (incl. a 400-room on-chain/off-chain parity check); typed; RLS on every table; two security reviews with fixes shipped | — |
| Potential impact | Market size, effect on crypto | Sports betting is huge and social; crypto invisible = mainstream users on Solana without knowing it | Keep claims to sourced numbers |
| Novelty | How unique? | Not first (say so). The combination is rarer: pools not just 1v1, a live room, hosts earn, invisible crypto | Crowded category (see below) |
| UX | Blockchain → great UX? | Email sign-in, embedded wallet, no SOL, gasless staking, payouts in seconds, stakes held by an on-chain program (rules users can verify: ≤6% fee, refund after 21 days) | — |
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

## Traction (true numbers, 8 Oct)

Use these, rounded; update the day you submit (the SQL is in the session log of 8 Oct — accounts, stakers, stakes, rooms with 2+ people, settled).
- 25 accounts, 15 of them in the last 7 days
- 14 people have staked; 63 stakes in 27 rooms
- 18 rooms had two or more people in them
- 5 rooms settled and paid automatically from live data, 4 refunded automatically
- 11 Arena posts, 20 follows, 20 chat messages

**Honest read:** this is small, and several accounts are the team's own. It's the weakest part of the submission — and the weekend before the deadline is a full matchday (below), the best chance to change it.

## Built during the hackathon (from git, 8 Oct)

The contest opened 14 Sep; Rivaly's first commit was 9 Aug. Since 14 Sep: **193 of 302 commits**, +64k / −15k lines. Built in the window: the on-chain escrow program (devnet, upgraded 8 Oct with a fee cap, a refund deadline and a two-step admin hand-over), automatic settlement from two live data providers, the Arena, host earnings, the sign-up grant, Rivaly Ops (admin), SEO/AI discovery, the help center with full Terms / Privacy / Responsible play, and two security reviews. Say plainly that the project predates the contest and show this list.

**Don't** quote the stake volume: it's devnet test USDC, mostly from testing, and judges will discount it. **Do** quote one real line from a user if you have one (a message, a tweet, "my mate and I settled our Arsenal argument"). Judges explicitly look for user feedback.

## Submission form text

**Name:** Rivaly

**One-liner:** Social prediction for sport: make a call on a match, people back it or take the other side, and the winners are paid automatically.

**Description:**
> Sports betting is already social: people argue about matches with friends on WhatsApp, Telegram and X, then place their bets alone with sportsbooks that profit when they lose. Rivaly is social prediction for sport. Anyone creates a prediction on a match, others back it or take the other side, and everyone watches together in a live room with the score, the big moments and a chat. When the official result is in, the pot is split among the winners automatically, in USDC on Solana, usually within seconds. Rivaly never takes a side; it charges only on winnings, and the host who brought everyone earns a share. Sign-in is email or Google, with a Solana wallet created behind the scenes, so users never need SOL or a crypto app. Live beta on devnet at rivaly.fun with football (Premier League, Champions League, top European leagues, MLS) and the NFL.

**Tracks:** Solana. Category: Consumer.

**Tools:** Solana, Anchor (the `rivaly_rooms` escrow program), USDC (SPL token), Dynamic embedded wallets, Helius RPC, Supabase, Next.js, TxLINE and Big Balls Data (live sports data).

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
3. **Staking (0:55–1:30).** Join a room → the server builds the program's `stake` instruction (USDC from the user into the room's vault), Rivaly co-signs and pays the fee, the user signs silently → the server checks it on-chain before the stake counts. Open the transaction on Solana Explorer.
4. **Settlement (1:30–2:10).** The worker writes live events; `resolveMarket` decides each market from official data; a 10-minute safety window for VAR; the pot is split pro rata minus the 5%-of-profit fee; payouts sent and recorded. Open a payout on Explorer. Mention: twin-record check (two data records disagree → no payout until resolved), $1 floor enforced by app, server and database.
5. **The on-chain escrow, honestly (2:10–2:40).** Open `rivaly_rooms` on Solana Explorer (FwPoC3Ng…7kLF, devnet). "Each room's stakes sit in a vault our program owns. The program only lets money go back to the people who staked in that room, caps our fee at 6% of winnings, and if we ever failed to post a result, anyone can refund the room 21 days after kick-off. What it doesn't do yet is decide results — our operator posts them from official data. The admin key is ready to move to a multisig." Show the 400-room parity test and a real program room's payout on Explorer. Never say "trustless" or "audited".

## The plan to the deadline (review of 8 Oct)

**Thu 8 / Fri 9 — decisions and set-up**
- [ ] Register on colosseum.com (every team member).
- [ ] Licence (open-source is a scored criterion; the README still says "all rights reserved"). Recommended: MIT for `onchain/` (composable, auditable), AGPL-3.0 for the app (open, but anyone who runs a copy must publish theirs). Founder's call.
- [ ] Write the team section with one true personal detail (positioning §7 is still a draft) — founder-market fit is the first thing judges score.
- [ ] Check the first real program room (Cowboys v Bucs, kick-off 9 Oct 00:15 UTC) settles and pays; keep its Explorer links for the tech demo.

**Sat 10 / Sun 11 — matchday: traction and footage**
Before the deadline: 10 Premier League, 10 La Liga, 10 Serie A, 9 Bundesliga, 9 Ligue 1, 18 MLS and 15 NFL games.
- [ ] Open rooms on the big games and share them into real group chats (not test accounts). Target by Sunday night: 50+ accounts, 30+ people staked, 10+ rooms settled.
- [ ] Screenshot real chat moments and ask two or three people for one honest line each — judges look for user feedback.
- [ ] Record the pitch video's app section during a live game (live room, goal moment, chat), and the settlement + payout after full time.
- [ ] Record the technical demo (script above).

**Sun 11 night — submit**
- [ ] Refresh the traction numbers, fill the form, upload both videos and the logo. Submit Sunday; the hard deadline is Mon 12 Oct 11:59pm PT (Tue 07:59 WAT).
