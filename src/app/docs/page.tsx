import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/seo/home-intro";
import { pageMeta } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

// How Rivaly works — the page people, search engines and AI assistants read
// to learn what Rivaly is. Answer first (the opening sentence is the
// definition), then the mechanics, a worked example with real maths, the
// fees, and the questions people actually ask. Every claim here must be true
// of what's shipped: fees are planSettlement's (lib/settlement/payouts.ts),
// competitions are what the score feeds cover. Update UPDATED when it changes.

const UPDATED = "2026-09-28";

export const metadata = pageMeta({
  title: "How Rivaly works — the social prediction market for football",
  description:
    "Rivaly is a social prediction market for football: make a call on a real match, challenge the people who disagree, and the pool pays the winners automatically. How rooms, escrow, settlement, fees and hosting work.",
  path: "/docs",
  absoluteTitle: true,
});

const faqs: { q: string; a: string }[] = [
  {
    q: "What is Rivaly?",
    a: "Rivaly is a social prediction market for football. You make a call on a real match — “Arsenal win”, “over 2.5 goals”, “Saka scores” — and put money on it in a room. People who disagree take the other side. Everyone watches the match together in the room, and when it ends the pool is paid to whoever called it right, automatically.",
  },
  {
    q: "Is Rivaly a sportsbook or a betting site?",
    a: "Rivaly is not a bookmaker. A sportsbook sets the odds and takes the other side of your bet, so it profits when you lose. On Rivaly you predict against other people: every stake goes into the room's pool, and the pool goes to the winners. Rivaly never takes a side and never bets against its users — it holds the pool, checks the result and pays out.",
  },
  {
    q: "How is Rivaly different from Polymarket or Kalshi?",
    a: "Polymarket and Kalshi are prediction exchanges: you trade shares at a price against anonymous traders, and the product is the probability. Rivaly is social: you choose who you're up against, anyone can open a room on a match, you watch it together with live chat, and there are no order books or share prices — you pick a side and the pool settles when the match ends.",
  },
  {
    q: "How do winners get paid?",
    a: "Automatically. When the match ends, the room settles against the result from the official match data feed, and the winning side splits the whole pool in proportion to what each person staked. The money lands in your Rivaly wallet — nothing to claim, no manual review.",
  },
  {
    q: "What are Rivaly's fees?",
    a: "5% of the winners' profit — never of anyone's stake. 3% goes to Rivaly and 2% to the room's host. Losers pay nothing beyond their stake, winners always get back at least what they put in, refunded rooms pay no fee, and Rivaly charges nothing to deposit or withdraw. A room's fee is fixed when it's created and shown before you stake.",
  },
  {
    q: "How do hosts earn?",
    a: "Whoever creates a room is its host and earns 2% of the winners' profit when it settles, whichever side wins. Earnings build up in one balance — pending while rooms are live, claimable once they settle — and are claimed in one transfer from $1. The more people a host brings to their rooms, the more they earn.",
  },
  {
    q: "What happens if nobody takes the other side, or the match is called off?",
    a: "Everyone gets their full stake back. A room where one side is empty, or whose match is postponed or cancelled, refunds every entry and pays no fee.",
  },
  {
    q: "Can I leave a room after joining?",
    a: "No — once your stake is in, it's committed until the room settles, the same as everyone else's. That's what keeps the pool fair to the people on the other side.",
  },
  {
    q: "Which matches can I predict on?",
    a: "The Premier League, the Champions League, La Liga, the Bundesliga, Serie A, Ligue 1, MLS and international friendlies, plus the NFL. A room can be on the result, the half-time result, goals over/under, both teams to score, the correct score, a handicap, corners, cards, a penalty, a red card, VAR, or a named player scoring.",
  },
  {
    q: "Do I need crypto to use Rivaly?",
    a: "No. You sign in with your email and a wallet is created for you in the background. Balances are held in USDC, a dollar stablecoin, on the Solana network — you never handle seed phrases or network fees to stake.",
  },
  {
    q: "Is it real money?",
    a: "Not yet. Rivaly is in beta: balances are test USDC on Solana devnet while we prepare for launch, and new accounts start with $5 of test USDC to play with.",
  },
];

const steps: { title: string; body: string }[] = [
  {
    title: "Make a call on a real match",
    body: "Pick a fixture and say what you think will happen — the result, goals, a scorer, cards. That call is the room. Choose your stake, and whether the room is public or private.",
  },
  {
    title: "Challenge the people who disagree",
    body: "Share the room's link anywhere — WhatsApp, X, TikTok. Anyone who thinks you're wrong takes the other side. Public rooms can also be found on Rivaly by anyone.",
  },
  {
    title: "The stakes are held until full time",
    body: "Every stake goes into escrow when it's placed and stays there, untouched, until the room settles. Nobody — not you, not your rival, not Rivaly — can take it out early.",
  },
  {
    title: "Watch it together",
    body: "Each room is a live viewing room: chat, the real match moments as they happen, and the two sides fighting for the stadium as the game swings.",
  },
  {
    title: "The result settles it",
    body: "When the match ends, the room settles against the official match data — stated on the room before anyone joins — and the winners are paid straight to their wallets.",
  },
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          url: siteUrl("/docs"),
          dateModified: UPDATED,
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />

      <h1 className="font-display text-title-1 text-foreground md:text-display">How Rivaly works</h1>
      <p className="mt-4 text-body-lg text-foreground">
        Rivaly is a social prediction market for football. You put your opinion on a match against someone else&rsquo;s, with
        money on it, and the winner is paid automatically. You predict against people — never against the house.
      </p>
      <p className="mt-3 text-caption text-tertiary">
        Updated <time dateTime={UPDATED}>28 September 2026</time>
      </p>

      <section className="mt-12">
        <h2 className="font-display text-title-3 text-foreground">A room, start to finish</h2>
        <ol className="mt-5 flex flex-col gap-6">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="w-6 shrink-0 font-display text-title-3 tabular-nums text-tertiary">{i + 1}</span>
              <div>
                <h3 className="text-body font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-body text-secondary">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-title-3 text-foreground">How the money works — an example</h2>
        <p className="mt-3 text-body text-secondary">
          A room on &ldquo;Arsenal win&rdquo;. $60 is staked on YES (Arsenal win) and $40 on NO. You put $10 on NO. Arsenal
          draw, so NO wins.
        </p>
        <dl className="mt-5 flex flex-col divide-y divide-line text-body">
          {[
            ["Pool", "$100"],
            ["Winners' profit (the losing side's money)", "$60"],
            ["Fee: 5% of that profit", "$3 — $1.80 to Rivaly, $1.20 to the host"],
            ["Paid to the NO side", "$97, split by stake"],
            ["Your share ($10 of the $40 on NO)", "$24.25 — your $10 back plus $14.25"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-6">
              <dt className="text-secondary">{k}</dt>
              <dd className="font-semibold tabular-nums text-foreground sm:text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-body text-secondary">
          The fewer people who back your side, the bigger your share if you&rsquo;re right. If Arsenal had won, the YES
          side would have split the pool instead.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-title-3 text-foreground">Questions</h2>
        <div className="mt-5 flex flex-col gap-7">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="text-body font-semibold text-foreground">{f.q}</h3>
              <p className="mt-1.5 text-body text-secondary">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-12 text-body text-secondary">
        Ready?{" "}
        <Link href="/rooms" className="font-semibold text-foreground hover:underline">
          See the rooms open right now
        </Link>{" "}
        or{" "}
        <Link href="/rooms/create" className="font-semibold text-foreground hover:underline">
          make your own call
        </Link>
        .
      </p>

      <SiteFooter />
    </main>
  );
}
