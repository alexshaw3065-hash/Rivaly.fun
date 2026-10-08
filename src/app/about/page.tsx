import Link from "next/link";
import { CompanyPage, DocSection } from "@/components/company/company-page";
import { JsonLd } from "@/components/seo/json-ld";
import { COMPANY, mailto } from "@/lib/company";
import { pageMeta } from "@/lib/seo";
import { SITE_URL, siteUrl } from "@/lib/site";
import { SOCIALS } from "@/lib/socials";

// About Rivaly — what it is and why it exists, for people and for the search
// engines / AI assistants that describe Rivaly to them. The mechanics live in
// /docs; this is the story. Copy comes from the agreed positioning
// (docs/masterplan/10-positioning-and-pitch.md) — change it there first.
// Every fact must stay true of what's shipped (fees: lib/settlement/payouts.ts;
// competitions: the score feeds; beta status).

export const metadata = pageMeta({
  title: "About Rivaly — social prediction for sport",
  description:
    "Why Rivaly exists: predicting football has always been social, but betting apps made it you against the house and prediction markets made it a price on a screen. Rivaly puts you up against the people you actually argue with.",
  path: "/about",
  absoluteTitle: true,
});

// Three ways to predict sport, side by side — the case for Rivaly shown
// rather than argued. Only claims the positioning doc stands behind.
const MODELS = ["Sportsbook", "Prediction market", "Rivaly"] as const;
const COMPARE: { label: string; values: [string, string, string] }[] = [
  { label: "You're up against", values: ["The house", "Strangers", "People you choose"] },
  { label: "What you're looking at", values: ["Odds set to beat you", "A price on a screen", "Your rival and the match"] },
  { label: "How you watch", values: ["Alone", "Alone", "Together, live"] },
];

const DIFFERENCES: { title: string; body: string }[] = [
  {
    title: "People, not the house",
    body: "Every stake goes into the room's pool and the pool goes to the winners. Rivaly never takes a side, never sets odds and never profits from anyone losing.",
  },
  {
    title: "You choose your rival",
    body: "Challenge a friend, a group chat or a whole following with one link. The other side has a name — that's the point.",
  },
  {
    title: "Watch it together",
    body: "Every room is a live viewing room: chat, the real match moments as they happen, and the two sides fighting for the stadium.",
  },
  {
    title: "Settled fairly, in plain sight",
    body: "Stakes are held until the result is decided by official match data — sometimes before the final whistle — and winners are paid automatically. The fee is 5% of winnings, never of a stake, and it's shown before you play.",
  },
];

export default function AboutPage() {
  return (
    <CompanyPage
      active="/about"
      title="About Rivaly"
      lede={
        <p>
          Rivaly is social prediction for sport. You put your prediction on a match against someone else&rsquo;s, with money on it, and the
          winner is paid automatically.
        </p>
      }
      contactLine={null}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          url: siteUrl("/about"),
          name: "About Rivaly",
          mainEntity: { "@id": `${SITE_URL}/#organization` },
        }}
      />

      <DocSection id="why" title="Why Rivaly exists">
        <p>
          Predicting football has always been social. The bet in the group chat. The argument in the pub that ends in &ldquo;I told you
          so&rdquo;. The fantasy league you play with the same friends every season.
        </p>
        <p>
          Betting apps turned that into you against the house — a company that sets the odds so it wins on average. Prediction markets turned
          it into a price on a screen, traded against strangers. Both took the money part and left the people behind.
        </p>
        <p className="text-body-lg text-foreground">
          Rivaly is the version where you go up against the people you actually argue with — and the winner gets paid.
        </p>
      </DocSection>

      <section aria-labelledby="compare-title">
        <h2 id="compare-title" className="sr-only">
          Three ways to predict sport
        </h2>
        <div className="overflow-hidden rounded-card bg-surface edge">
          <div className="grid grid-cols-3">
            {MODELS.map((m, i) => (
              <p
                key={m}
                className={`px-3 py-3 text-caption font-semibold md:px-5 ${i === 2 ? "bg-yes-tint text-yes-ink" : "text-tertiary"}`}
              >
                {m}
              </p>
            ))}
          </div>
          {COMPARE.map((row) => (
            <div key={row.label} className="border-t border-line">
              <div className="grid grid-cols-3">
                <p className="col-span-2 px-3 pt-3 text-caption text-tertiary md:px-5">{row.label}</p>
                <span aria-hidden className="bg-yes-tint" />
              </div>
              <div className="grid grid-cols-3">
                {row.values.map((v, i) => (
                  <p
                    key={i}
                    className={`px-3 pb-3 pt-1.5 text-label md:px-5 md:text-body ${i === 2 ? "bg-yes-tint font-semibold text-foreground" : "text-secondary"}`}
                  >
                    {v}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <DocSection id="different" title="What makes it different">
        <div className="flex flex-col gap-5">
          {DIFFERENCES.map((d) => (
            <div key={d.title}>
              <h3 className="font-semibold text-foreground">{d.title}</h3>
              <p className="mt-1">{d.body}</p>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection id="hosts" title="Anyone can host">
        <p>
          Whoever opens a room is its host, and earns 2% of the winners&rsquo; profit when it settles — whichever side wins. The more people a
          host brings in, the bigger the room and the more they earn. So every host, from a group-chat regular to a football creator, has a
          reason to bring their own rivals.
        </p>
      </DocSection>

      <DocSection id="today" title="Where Rivaly is today">
        <p>
          Rivaly is in beta. Balances are test USDC on Solana devnet while we prepare for launch, and every new account starts with $5 to play
          with. You sign in with your email — no crypto wallet or setup needed. Rooms cover the Premier League, the Champions League, La Liga,
          the Bundesliga, Serie A, Ligue 1, MLS, international friendlies and the NFL, and the app is built to load fast on a phone, even on a
          slow connection.
        </p>
        <p>
          Before real money goes live: mainnet, local-currency deposits and withdrawals, and self-serve responsible-play tools. How we think
          about that is on our <Link href="/responsible-play">Responsible play</Link> page.
        </p>
      </DocSection>

      <DocSection id="contact" title="Contact">
        <dl className="flex flex-col">
          <div className="flex justify-between gap-6 border-t border-line py-3 first:border-0 first:pt-0">
            <dt>Press, partnerships and support</dt>
            <dd>
              <a href={mailto()}>{COMPANY.email}</a>
            </dd>
          </div>
          <div className="flex justify-between gap-6 border-t border-line py-3">
            <dt>Follow</dt>
            <dd className="flex flex-wrap justify-end gap-x-4 gap-y-1">
              {SOCIALS.map((s) => (
                <a key={s.key} href={s.href} target="_blank" rel="me noopener noreferrer">
                  {s.label}
                </a>
              ))}
            </dd>
          </div>
        </dl>
        <p>
          <Link href="/docs">See exactly how it works</Link>, or <Link href="/rooms">jump into a room</Link>.
        </p>
      </DocSection>
    </CompanyPage>
  );
}
