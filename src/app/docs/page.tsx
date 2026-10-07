import Link from "next/link";
import { CompanyPage, DocList, DocSection } from "@/components/company/company-page";
import { JsonLd } from "@/components/seo/json-ld";
import { SplitBar } from "@/components/split-bar";
import { POLICY_DATES, formatPolicyDate } from "@/lib/company";
import { pageMeta } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

// How Rivaly works — the page people, search engines and AI assistants read
// to learn what Rivaly is. Answer first (the opening sentence is the
// definition), then the mechanics, a worked example with real maths, the
// fees, and the questions people actually ask. Every claim here must be true
// of what's shipped: fees are planSettlement's (lib/settlement/payouts.ts),
// competitions are what the score feeds cover. Update POLICY_DATES.guide
// (lib/company.ts) when it changes.

const UPDATED = POLICY_DATES.guide;

export const metadata = pageMeta({
  title: "How Rivaly works — social prediction for sport",
  description:
    "Rivaly is social prediction for sport: create a prediction on a real match, others back it or take the other side, and the pool pays the winners automatically. How rooms, escrow, settlement, fees and hosting work.",
  path: "/docs",
  absoluteTitle: true,
});

const faqs: { q: string; a: string }[] = [
  {
    q: "What is Rivaly?",
    a: "Rivaly is social prediction for sport, starting with football and the NFL. You create a prediction on a real match — “Arsenal win”, “over 2.5 goals”, “Saka scores” — and put money on it in a room. Others back you or take the other side. Everyone watches the match together in the room, and when the result is decided the pool is split among everyone who called it right, automatically.",
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
    title: "Create a prediction on a real match",
    body: "Pick a fixture and say what you think will happen — the result, goals, a scorer, cards. That call is the room. Choose your stake, and whether the room is public or private.",
  },
  {
    title: "A rival takes the other side",
    body: "Anyone on Rivaly who thinks you're wrong can find your room and take the other side. Want a particular rival? Send them the link — WhatsApp, X, anywhere.",
  },
  {
    title: "The stakes are held until it’s decided",
    body: "Every stake goes into escrow when it's placed and stays there, untouched, until the room settles — the moment its result is certain, sometimes before the final whistle. Nobody — not you, not your rival, not Rivaly — can take it out early.",
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

const TOC = [
  { id: "room", label: "A room, start to finish" },
  { id: "money", label: "How the money works" },
  { id: "fees", label: "Fees" },
  { id: "hosting", label: "Hosting" },
  { id: "trust", label: "Why you can trust the result" },
  { id: "questions", label: "Questions" },
];

// The worked example, drawn as the receipt a room actually produces: the
// call, the split, then the money line by line. Arsenal draw; NO wins.
const RECEIPT: [string, string][] = [
  ["Pool", "$100.00"],
  ["Winners' profit (the YES side's money)", "$60.00"],
  ["Fee: 5% of that profit", "−$3.00"],
  ["Paid to the NO side", "$97.00"],
];

export default function DocsPage() {
  return (
    <CompanyPage
      active="/docs"
      title="How Rivaly works"
      lede={
        <>
          <p className="text-foreground">
            Rivaly is social prediction for sport. You put your prediction on a match against someone else&rsquo;s, with money on it, and the
            winner is paid automatically.
          </p>
          <p className="mt-3">You predict against people — never against the house.</p>
        </>
      }
      meta={
        <>
          Updated <time dateTime={UPDATED}>{formatPolicyDate(UPDATED)}</time>
        </>
      }
      toc={TOC}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          url: siteUrl("/docs"),
          dateModified: UPDATED,
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />

      <DocSection id="room" title="A room, start to finish">
        <ol className="flex flex-col gap-5">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="w-5 shrink-0 tabular-nums text-tertiary">{i + 1}</span>
              <div>
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection id="money" title="How the money works">
        <p>
          A room on &ldquo;Arsenal win&rdquo;. $60 is staked on YES and $40 on NO. You put $10 on NO. Arsenal draw, so NO wins, and the NO side
          splits the pool by stake.
        </p>
        <figure className="overflow-hidden rounded-card bg-surface edge">
          <div className="p-5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-display text-title-3 text-foreground">Arsenal win</p>
              <p className="shrink-0 text-caption font-semibold text-no-ink">NO wins</p>
            </div>
            <div className="mt-4">
              <SplitBar leftPct={60} leftLabel="Yes $60" rightLabel="$40 No" />
            </div>
          </div>
          <dl className="border-t border-line px-5 py-2">
            {RECEIPT.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-6 py-2">
                <dt>{k}</dt>
                <dd className="shrink-0 tabular-nums text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center justify-between gap-6 border-t border-line bg-money-tint px-5 py-4">
            <div>
              <p className="font-semibold text-foreground">Your share</p>
              <p className="text-caption">$10 of the $40 on NO</p>
            </div>
            <p className="font-display text-title-2 tabular-nums text-money-ink">$24.25</p>
          </div>
          <figcaption className="sr-only">
            Worked example: a $100 pool, $60 on YES and $40 on NO. NO wins; after a $3 fee the NO side is paid $97, and a $10 stake on NO
            returns $24.25.
          </figcaption>
        </figure>
        <p>
          That&rsquo;s your $10 back plus $14.25. The fewer people who back your side, the bigger your share if you&rsquo;re right. If Arsenal
          had won, the YES side would have split the pool instead.
        </p>
      </DocSection>

      <DocSection id="fees" title="Fees">
        <DocList
          items={[
            <>
              <strong>5% of the winners&rsquo; profit</strong>, never of anyone&rsquo;s stake. In the example that&rsquo;s $3 of the $60 the NO
              side won: $1.80 to Rivaly and $1.20 to the host.
            </>,
            <>Losers pay nothing beyond their stake, and winners always get back at least what they put in.</>,
            <>A room&rsquo;s fee is fixed when it&rsquo;s created and shown before you stake. Refunded rooms pay none.</>,
            <>Rivaly charges nothing to deposit or withdraw.</>,
          ]}
        />
      </DocSection>

      <DocSection id="hosting" title="Hosting">
        <p>
          Whoever creates a room is its host and earns 2% of the winners&rsquo; profit when it settles, whichever side wins. Earnings build up
          in one balance — pending while rooms are live, claimable once they settle — and are claimed in one transfer from $1. The more people a
          host brings in, the bigger the room and the more they earn.
        </p>
      </DocSection>

      <DocSection id="trust" title="Why you can trust the result">
        <DocList
          items={[
            <>
              <strong>Rivaly never takes a side.</strong> The pool is only the stakes of the people in the room, and it&rsquo;s only paid to
              them.
            </>,
            <>
              <strong>The money is held, not spent.</strong> Stakes sit in escrow on the Solana network from the moment they&rsquo;re placed
              until the room settles. Nobody can take them out early.
            </>,
            <>
              <strong>Official data decides it.</strong> Rooms settle on the official match data feed, against the prediction exactly as
              written, never a judgement call after the fact.
            </>,
            <>
              <strong>Nothing is hidden.</strong> The fee is on the stake panel, the result and your receipt, and refunds are automatic when a
              match is called off or one side is empty.
            </>,
          ]}
        />
        <p>
          The full rules are in our <Link href="/terms">Terms of Use</Link>.
        </p>
      </DocSection>

      <DocSection id="questions" title="Questions">
        <dl className="flex flex-col">
          {faqs.map((f) => (
            <div key={f.q} className="border-t border-line py-4 first:border-0 first:pt-1">
              <dt className="font-semibold text-foreground">{f.q}</dt>
              <dd className="mt-1.5">{f.a}</dd>
            </div>
          ))}
        </dl>
        <p>
          Ready? <Link href="/rooms">See the rooms open right now</Link> or <Link href="/rooms/create">create your own prediction</Link>.
        </p>
      </DocSection>
    </CompanyPage>
  );
}
