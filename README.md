# Rivaly

**Social prediction for sport.** Make a call on a match, challenge the people who disagree, watch it together in a live room, and the winning side splits the pot. People play people, never the house.

[rivaly.fun](https://www.rivaly.fun) · [How Rivaly works](https://www.rivaly.fun/docs) · [About](https://www.rivaly.fun/about) · [X](https://x.com/Rivaly_fun)

> Rivaly is in **beta** on Solana devnet. Balances are test USDC.

## How it works

1. **Make a call.** Pick a match and a prediction: "Arsenal to win", "Over 2.5 goals", "Saka to score".
2. **Someone takes the other side.** Friends, followers or strangers back YES or NO with a stake ($1 minimum).
3. **Watch it together.** The room has live scores, the match timeline and a chat for everyone with a stake.
4. **The winners are paid.** When the official result is in, Rivaly settles the room and pays the winning side in proportion to their stakes. A void or one-sided room refunds everyone.

Rivaly referees the result and never takes a side or profits from anyone losing. New rooms hold their stakes in Rivaly's on-chain program on Solana, not in a company wallet. When fees are on, they are 5% of the winners' *profit* (3% Rivaly, 2% the room's host), never of a stake, and they are shown before you stake.

Football comes first (Premier League, Champions League, La Liga, Bundesliga, Serie A, Ligue 1, MLS), and the NFL is live too.

## Tech

| Part | What it uses |
|---|---|
| App | Next.js (App Router, TypeScript), Tailwind v4, deployed on Vercel |
| Data | Supabase: Postgres with row-level security, Auth, Realtime, Storage |
| Sign-in and wallets | Dynamic (Google, Apple, email, or a Solana wallet) |
| Money | USDC on Solana. Each room's stakes sit in a vault owned by the `rivaly_rooms` program (Anchor); the server builds the transactions and pays the network fees, so users never need SOL |
| Live scores | TxLINE (Premier League, NFL) and Big Balls Data (other leagues), via an always-on worker on Render |
| Media | Cloudinary (photos), TheSportsDB (team crests) |

## The on-chain escrow

`rivaly_rooms` ([onchain/programs/rivaly_rooms](onchain/programs/rivaly_rooms/src/lib.rs)) is live on devnet at [`FwPoC3NgmMVwoHk7QUGGotmx7dbsSNF5E6N7enxx7kLF`](https://explorer.solana.com/address/FwPoC3NgmMVwoHk7QUGGotmx7dbsSNF5E6N7enxx7kLF?cluster=devnet). What the program guarantees, whatever the server does:

- A room's USDC can only leave its vault to the people who staked in that room (winnings or refunds), and, once everyone is paid, the room's fee to Rivaly's treasury.
- The split is computed on-chain with the same arithmetic as the app's settlement (checked by a 400-room parity test): winners share the pool pro rata; fees are a cut of the winners' profit only, at most 6% in total.
- Stakes close at kick-off. If a room is still unresolved 21 days after that, anyone can void it and everyone is refunded.
- The admin key changes hands only in two steps (propose, then the new admin signs to accept), ready to move to a multisig.

What it doesn't do: decide results. Rivaly's operator key submits the outcome from official match data. It can't send money anywhere but a room's own stakers.

Tests: `onchain/scripts/wsl-build.sh test` (45 tests: refusals, attacks, the parity check, start to finish), and `onchain/scripts/devnet-e2e.mts` runs the app's own transaction code against the deployed program.

## Repository

```
src/app/          pages and server actions (rooms, arena, wallet, profile, admin)
src/components/   UI; src/components/ui/ is the design-system kit
src/lib/          settlement, markets, fees, escrow, data providers, SEO
supabase/         database migrations (schema, RLS, triggers, SQL functions)
worker/           the live-scores worker (see worker/README.md)
onchain/          the rivaly_rooms Solana program, its tests and deploy scripts
docs/             product masterplan, design references and plans
```

The product rules every change is held to are in [docs/masterplan](docs/masterplan/README.md) and summarised in [CLAUDE.md](CLAUDE.md).

## Running it locally

Needs Node 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local   # then fill in the values it describes
npm run dev                  # http://localhost:3000
```

Apply the migrations in `supabase/migrations/` to your Supabase project in order.

Checks:

```bash
npm test             # ~170 unit tests (settlement, fees, markets, match feed)
npm run lint         # ESLint
npm run lint:design  # design-system drift report
```

## Security

Secrets (database service key, escrow and welcome wallet keys, API tokens) live only in the hosting providers' environment settings and are never committed. If you find a security problem, please email support@rivaly.fun rather than opening a public issue. Reviews so far: [docs/security](docs/security/).

## Licence

© Rivaly. All rights reserved. The code is public to read; it is not licensed for reuse.
