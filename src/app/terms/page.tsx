// Genuine early-stage terms, not filler — but explicitly labeled as a
// pre-launch draft so it isn't read as a finished legal document. Should
// be reviewed by an actual lawyer before Rivaly takes real deposits.
export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 md:px-6">
      <p className="font-mono text-[11px] uppercase tracking-wider text-rival-blue">Legal</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">Terms of Use</h1>
      <p className="mt-3 text-sm text-muted">
        Pre-launch draft, last updated August 2026. This covers how Rivaly works today and will be
        formalized before real deposits go live.
      </p>

      <div className="mt-10 flex flex-col gap-7">
        <section>
          <h2 className="font-display text-base font-semibold text-foreground">1. What Rivaly is</h2>
          <p className="mt-2 text-sm text-muted">
            Rivaly is a peer-to-peer social prediction platform for football. Users predict against
            each other in rooms they create or join — Rivaly is not a party to any prediction, does
            not set odds, and never takes the opposite side of a user&rsquo;s position. Rivaly&rsquo;s
            role is to hold pooled funds in escrow and settle rooms against the stated resolution
            source.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-foreground">2. Eligibility</h2>
          <p className="mt-2 text-sm text-muted">
            You must be old enough to enter binding agreements and to participate in real-money
            prediction activity under the laws that apply to you, and responsible for confirming
            that using Rivaly is lawful where you live.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-foreground">3. Funds and escrow</h2>
          <p className="mt-2 text-sm text-muted">
            Stakes move into escrow when you join a room and are held there, unaltered, until the
            room settles. Your Wallet always shows what&rsquo;s available, pending, and in escrow.
            Rivaly does not lend, invest, or otherwise use held funds.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-foreground">4. Settlement and disputes</h2>
          <p className="mt-2 text-sm text-muted">
            Every room discloses its resolution source before anyone can join. Rooms settle against
            that source once the match concludes. If a match is postponed, abandoned, or otherwise
            can&rsquo;t be fairly resolved, entries are refunded in full.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-foreground">5. Conduct</h2>
          <p className="mt-2 text-sm text-muted">
            No manipulating outcomes, colluding across entries, or using Rivaly for anything other
            than genuine prediction between real rivals.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-foreground">6. Changes</h2>
          <p className="mt-2 text-sm text-muted">
            These terms will change as Rivaly moves from pre-launch to a live product. Material
            changes will be surfaced in-app, not silently applied.
          </p>
        </section>
      </div>
    </main>
  );
}
