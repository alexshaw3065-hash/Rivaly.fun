// The mobile "more" menu's Documentation link. Real, user-facing
// mechanics — not a re-post of the internal masterplan (which is written
// for people building the product, not people using it). Every claim
// here should already be true of what's shipped or clearly labeled as
// how it will work.
export default function DocsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 md:px-6">
      <p className="tabular-nums text-caption uppercase text-yes-ink">Documentation</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
        How Rivaly works
      </h1>
      <p className="mt-3 text-body text-secondary">
        Rivaly is a peer-to-peer social prediction platform for football. You&rsquo;re not betting
        against a bookmaker — you&rsquo;re predicting against another person who disagrees with you.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">1. Create or join a room</h2>
          <p className="mt-2 text-body text-secondary">
            A room is a specific prediction about a real match — &ldquo;Arsenal wins,&rdquo; &ldquo;Over
            2.5 goals,&rdquo; whatever you believe. Set the stake and share it, or join a room someone
            else already created by taking the opposing side.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">2. Rivaly holds the pool</h2>
          <p className="mt-2 text-body text-secondary">
            Every entry&rsquo;s stake moves into escrow the moment you join — visible on your Wallet
            the whole time as money &ldquo;in escrow.&rdquo; Rivaly never takes a side and never bets
            against you; it holds the pool and pays it out based on what actually happened.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">3. The match decides it</h2>
          <p className="mt-2 text-body text-secondary">
            Every room states its resolution source before anyone joins, so you know exactly what
            settles it going in — never a judgment call made after the fact.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">4. Settlement is automatic</h2>
          <p className="mt-2 text-body text-secondary">
            Once the match ends, the room settles and the pool splits to whoever called it right.
            Payouts land back in your wallet balance — no claiming, no waiting on manual review.
          </p>
        </section>
      </div>
    </main>
  );
}
