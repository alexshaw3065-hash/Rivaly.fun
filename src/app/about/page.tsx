import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/seo/site-footer";
import { pageMeta } from "@/lib/seo";
import { SITE_URL, siteUrl } from "@/lib/site";

// About Rivaly — what it is and why it exists, for people and for the search
// engines / AI assistants that describe Rivaly to them. The mechanics live in
// /docs; this is the story. Every fact must stay true of what's shipped
// (fees: lib/settlement/payouts.ts; competitions: the score feeds; beta status).

export const metadata = pageMeta({
  title: "About Rivaly — the social prediction market for football",
  description:
    "Why Rivaly exists: predicting football has always been social, but betting apps made it you against the house and prediction markets made it a price on a screen. Rivaly puts you up against the people you actually argue with.",
  path: "/about",
  absoluteTitle: true,
});

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
    body: "Stakes are held until full time, the official match data decides it, and winners are paid automatically. The fee is 5% of winnings — never of a stake — and it's shown before you play.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          url: siteUrl("/about"),
          name: "About Rivaly",
          mainEntity: { "@id": `${SITE_URL}/#organization` },
        }}
      />

      <h1 className="font-display text-title-1 text-foreground md:text-display">About Rivaly</h1>
      <p className="mt-4 text-body-lg text-foreground">
        Rivaly is the social prediction market for football. You put your opinion on a match against someone else&rsquo;s,
        with money on it, and the winner is paid automatically.
      </p>

      <section className="mt-12">
        <h2 className="font-display text-title-3 text-foreground">Why Rivaly exists</h2>
        <div className="mt-3 flex flex-col gap-4 text-body text-secondary">
          <p>
            Predicting football has always been social. The bet in the group chat. The argument in the pub that ends in
            &ldquo;I told you so&rdquo;. The fantasy league you play with the same friends every season.
          </p>
          <p>
            Betting apps turned that into you against the house — a company that sets the odds so it wins on average.
            Prediction markets turned it into a price on a screen, traded against strangers. Both took the money part and
            left the people behind.
          </p>
          <p className="text-foreground">
            Rivaly is the version where you go up against the people you actually argue with — and the winner gets paid.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-title-3 text-foreground">What makes it different</h2>
        <div className="mt-5 flex flex-col gap-6">
          {DIFFERENCES.map((d) => (
            <div key={d.title}>
              <h3 className="text-body font-semibold text-foreground">{d.title}</h3>
              <p className="mt-1 text-body text-secondary">{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-title-3 text-foreground">Anyone can host</h2>
        <p className="mt-3 text-body text-secondary">
          Whoever opens a room is its host, and earns 2% of the winners&rsquo; profit when it settles — whichever side wins.
          The more people a host brings in, the bigger the room and the more they earn. So every host, from a group-chat
          regular to a football creator, has a reason to bring their own rivals.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-title-3 text-foreground">Where Rivaly is today</h2>
        <p className="mt-3 text-body text-secondary">
          Rivaly is in beta. Balances are test USDC on Solana devnet while we prepare for launch, and every new account
          starts with $5 to play with. You sign in with your email — no crypto wallet or setup needed. Rooms cover the
          Premier League, the Champions League, La Liga, the Bundesliga, Serie A, Ligue 1, MLS, international friendlies and
          the NFL, and the app is built to load fast on a phone, even on a slow connection.
        </p>
      </section>

      <p className="mt-12 text-body text-secondary">
        <Link href="/docs" className="font-semibold text-foreground hover:underline">
          See exactly how it works
        </Link>
        , or{" "}
        <Link href="/rooms" className="font-semibold text-foreground hover:underline">
          jump into a room
        </Link>
        .
      </p>

      <SiteFooter />
    </main>
  );
}
