# Rivaly

**Social prediction for sport.** Make a call on a match, challenge the people who disagree, watch it together in a live room, and the winning side splits the pot. People play people, never the house.

[rivaly.fun](https://www.rivaly.fun) · [How Rivaly works](https://www.rivaly.fun/docs) · [About](https://www.rivaly.fun/about) · [X](https://x.com/Rivaly_fun)

> Rivaly is in **beta** on Solana devnet. Balances are test USDC.

## How it works

1. **Make a call.** Pick a match and a prediction: "Arsenal to win", "Over 2.5 goals", "Saka to score".
2. **Someone takes the other side.** Friends, followers or strangers back YES or NO with a stake ($1 minimum).
3. **Watch it together.** The room has live scores, the match timeline and a chat for everyone with a stake.
4. **The winners are paid.** When the official result is in, Rivaly settles the room and pays the winning side in proportion to their stakes. A void or one-sided room refunds everyone.

Rivaly holds the stakes and referees the result. It never takes a side and never profits from anyone losing. When fees are on, they are 5% of the winners' *profit* (3% Rivaly, 2% the room's host), never of a stake, and they are shown before you stake.

Football comes first (Premier League, Champions League, La Liga, Bundesliga, Serie A, Ligue 1, MLS), and the NFL is live too.

## Tech

| Part | What it uses |
|---|---|
| App | Next.js (App Router, TypeScript), Tailwind v4, deployed on Vercel |
| Data | Supabase: Postgres with row-level security, Auth, Realtime, Storage |
| Sign-in and wallets | Dynamic (Google, Apple, email, or a Solana wallet) |
| Money | USDC on Solana, held in a Rivaly escrow wallet and paid out by the server |
| Live scores | TxLINE (Premier League, NFL) and Big Balls Data (other leagues), via an always-on worker on Render |
| Media | Cloudinary (photos), TheSportsDB (team crests) |

## Repository

```
src/app/          pages and server actions (rooms, arena, wallet, profile, admin)
src/components/   UI; src/components/ui/ is the design-system kit
src/lib/          settlement, markets, fees, escrow, data providers, SEO
supabase/         database migrations (schema, RLS, triggers, SQL functions)
worker/           the live-scores worker (see worker/README.md)
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
npm test             # unit tests (settlement, fees, markets, match feed)
npm run lint         # ESLint
npm run lint:design  # design-system drift report
```

## Security

Secrets (database service key, escrow and welcome wallet keys, API tokens) live only in the hosting providers' environment settings and are never committed. If you find a security problem, please report it privately through [rivaly.fun/support](https://www.rivaly.fun/support) rather than opening a public issue.

## Licence

© Rivaly. All rights reserved. The code is public to read; it is not licensed for reuse.
