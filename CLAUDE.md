# Rivaly

This repository will build **Rivaly**, a peer-to-peer social prediction platform for football. Every decision made in this codebase — product, design, and engineering — must be consistent with the masterplan summarized below. Full detail lives in [docs/masterplan/](docs/masterplan/README.md); read the linked file when you need more than the summary.

**This document is the guardrail. Hold it tight.** If a proposed feature or design conflicts with it, flag the conflict instead of silently building around it.

## What Rivaly Is

A Peer-to-Peer Social Prediction Platform. Anyone can create prediction rooms around live football events where people with opposing opinions compete with real money in transparent, custom markets. Users predict against **each other**, not against a bookmaker. Rivaly holds funds securely, verifies outcomes, and settles rooms fairly — it never bets against its users.

**Rivaly is not:** a sportsbook, a casino, a bookmaker, a traditional prediction exchange, or another social network.

> Sportsbooks ask "Can you beat the house?" Prediction markets ask "What is the probability?" **Rivaly asks "Who thinks differently than you?"**

Full version: [docs/masterplan/01-vision.md](docs/masterplan/01-vision.md)

## The Rivaly Formula

```
Prediction × Money × Experience = Rivaly
```

Remove any one pillar and it stops being Rivaly. A feature only belongs if it strengthens **Predictions, Rivalry, or Social** — everything else waits ([docs/masterplan/00-first-principles.md](docs/masterplan/00-first-principles.md), principle #7).

## The Ten First Principles (test question for each)

1. **Football Comes First** — Does this make watching football more exciting?
2. **People Want to Beat People** — Does this strengthen rivalry between users?
3. **Predictions Are the Product** — Does this improve the prediction experience?
4. **Money Creates Stakes, Not Meaning** — Does this make winning feel more meaningful, not just pay more?
5. **Trust Must Be Visible** — Can users clearly see why this outcome happened?
6. **Rivaly Never Bets Against Its Users** — Does this reinforce Rivaly as referee, not house?
7. **Every Feature Must Earn Its Place** — What core experience does this improve?
8. **Every Prediction Should Feel Personal** — Does this make predictions feel more personal?
9. **Every Match Should Create a Story** — What story does this help users create?
10. **Great Products Grow Through People** — Does this make someone want to bring in another rival?

Full elaboration: [docs/masterplan/02-principles-deep-dive.md](docs/masterplan/02-principles-deep-dive.md)

## What Rivaly Will Never Become

A sportsbook that depends on users losing · a casino disguised as entertainment · a confusing exchange built only for professionals · a spreadsheet of markets and probabilities · a product that exploits addiction via dark patterns · a platform that hides settlement/payout logic · a platform where football becomes secondary to finance.

If a feature increases revenue but damages trust, excitement, or the prediction experience, don't build it. ([docs/masterplan/03-product-philosophy.md](docs/masterplan/03-product-philosophy.md))

## Design Principles

- **Clean** — one obvious primary action per screen; no unexplained interface. If it needs explaining, it's too complicated.
- **Fast** — every interaction should feel instant; creating/joining a room takes seconds; one-tap challenges.
- **Loud where it matters** — go big only for goals, penalties, VAR, red cards, match winners, milestones. If everything is loud, nothing is important.
- **Minimal everywhere else** — no odds tables, no financial-terminal aesthetic. Users should feel like they're watching football with friends, not trading assets.
- **Emotion before information** — every design decision asks "what should the user feel?", not "what should the user see?"
- **Football above everything** — Football beats Prediction, Entertainment beats Monetization, Community beats Complexity, whenever they conflict.
- **Invisible technology** — wallets, escrow, settlement, blockchain happen silently in the background. Users think about football, not infrastructure.

Full version: [docs/masterplan/04-design-principles.md](docs/masterplan/04-design-principles.md)

## The Rivaly Test — run before shipping any feature

1. Does this make football more entertaining?
2. Does this create more rivalry?
3. Does this encourage sharing?
4. Does this make users feel something?
5. Is this the simplest possible version?
6. Would removing this feature make the experience worse?
7. Can a new user understand this in five seconds?
8. Does this feel like Rivaly?

If several answers are "No," redesign or cut it.

## V1 Scope — be ruthless

Rivaly's one thing: **"I want to put my football opinion up against someone else's in under 30 seconds."** Everything in V1 serves that.

**Build:** Home (live matches, trending rooms) · Room (chat, pool, predictions, join/leave, settlement) · Create Room (fast) · Search (rooms, matches, users) · Profile (minimal: history, followers, accuracy) · Wallet (deposit, withdraw, balance) · Following (core network effect, not a nice-to-have).

**Do not build yet:** Communities, club/fan groups, voice chat, streaming, tournaments, AI features, complex achievements, creator monetization. These are V2+ — see [docs/masterplan/07-product-blueprint.md](docs/masterplan/07-product-blueprint.md) for the full long-term surface area.

Core loop: `Create Room → Challenge Friends → People Join → Live Match → Chat Explodes → Winner Paid → Screenshots → People Share → New Users → More Rooms`

Full version: [docs/masterplan/08-v1-scope.md](docs/masterplan/08-v1-scope.md)

## Growth

Growth is a product feature, not a marketing strategy — a room without opponents isn't a room, so sharing is gameplay, not a favor to Rivaly. Design every room/prediction to be inherently shareable (deep links, screenshot-worthy moments, visible pools/stakes). Details: [docs/masterplan/05-growth.md](docs/masterplan/05-growth.md)

## Emotion Design

The one emotion Rivaly should own is **anticipation** — the feeling just before kickoff, before a penalty, before a friend accepts a challenge. Winning should feel elegant and premium (Apple), never a slot-machine confetti explosion (Vegas). Losing should never make users feel stupid — always show the close call and offer an instant rematch. Full screen-by-screen emotional spec, haptics, and color psychology: [docs/masterplan/06-emotion-design.md](docs/masterplan/06-emotion-design.md)

## Competitive Positioning

Borrow mechanisms, not identities: speed/accessibility/payments from betting platforms (SportyBet, Stake), transparency/probability from prediction markets (Polymarket, Kalshi), identity/rivalry/sharing from social products. Reject sportsbook UX (odds tables, casino aesthetic), intimidating trading-terminal UX, and crypto UX (seed phrases, gas anxiety, wallet complexity) — crypto is infrastructure, never a user-facing requirement. Full version: [docs/masterplan/09-competitive-research.md](docs/masterplan/09-competitive-research.md)

## Visual Craft References

Two references govern execution quality on top of the Design Principles above — apply them to every screen, not just the waitlist:

- [docs/design-references/anti-slop-design-law.md](docs/design-references/anti-slop-design-law.md) — the pols.dev anti-slop law. A long, specific catalog of generic-AI-design tells (glowy gradient pills, random floating cards, blue-purple gradients, pulsing glow dots, the default SaaS section stack, and dozens more) and what premium execution looks like instead. Treat it as a design-quality lens, not a literal checklist to run top to bottom — the point is making a real creative decision, not just avoiding every listed pattern.
- [docs/design-references/rivaly-redesign-brief.md](docs/design-references/rivaly-redesign-brief.md) — the founder's design-direction brief: visual language (premium/editorial/restrained), the "show, don't explain" rule (a real prediction card beats a paragraph every time), and a reference landing-page narrative structure. Where its specific structure (e.g. a multi-section scroll) conflicts with a settled product decision (e.g. the waitlist's single-viewport layout), the settled decision wins — this is direction, not a literal template.

## Tech Stack

- **App:** Next.js (App Router, TypeScript, Tailwind v4), dark-first theme. Deployed on Vercel.
- **Backend:** Supabase — Postgres, Auth, RLS, Realtime, Storage. Client/server helpers live in `src/lib/supabase/`; no project is linked yet (see `.env.example`).
- **Repo:** [github.com/alexshaw3065-hash/Rivaly.fun](https://github.com/alexshaw3065-hash/Rivaly.fun)
- **Planned, not yet wired up:** Redis (cache, rate limits, queues — e.g. live pool/leaderboard state, settlement job queues) and Cloudinary (media — avatars, room/match images, video). Add these when a concrete feature needs them, not preemptively; V1 scope ([08-v1-scope.md](docs/masterplan/08-v1-scope.md)) doesn't require either yet.

## Working Conventions

- Before adding any feature or screen, check it against the Rivaly Test above and against [08-v1-scope.md](docs/masterplan/08-v1-scope.md); most things wait.
- When something in the codebase seems to drift from these principles, say so explicitly rather than quietly following the drift.
- Keep this file and `docs/masterplan/` in sync if the founder revises the masterplan — update the relevant section here and in the corresponding `docs/masterplan/*.md` file together.
