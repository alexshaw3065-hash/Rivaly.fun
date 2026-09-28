// Real self-serve answers about how the product actually works, drawn
// from the same mechanics as /docs. Deliberately no invented contact
// email/channel here — a made-up address that bounces is worse than no
// address at all. Add a real one once there's an actual support inbox.
const faqs = [
  {
    q: "Where's my money?",
    a: "Check Wallet — it always shows your available balance, anything pending, and what's currently in escrow across your active rooms. Money never sits somewhere the app can't show you.",
  },
  {
    q: "How does a room get settled?",
    a: "Against the resolution source stated on the room before you joined — never a judgment call made after the fact. Once the match ends, settlement is automatic.",
  },
  {
    q: "What happens if a match is postponed or cancelled?",
    a: "Every entry in that room is refunded in full back to your wallet balance.",
  },
  {
    q: "Can I leave a room after joining?",
    a: "Once your stake is in escrow it's committed to that room, the same way it is for everyone else in it — that's what makes the pool fair to whoever's on the other side.",
  },
  {
    q: "Does Rivaly ever bet against me?",
    a: "No. Rivaly holds the pool and settles it — it's never a party to any prediction.",
  },
];

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 md:px-6">
      <p className="tabular-nums text-caption uppercase text-yes-ink">Support</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
        Common questions
      </h1>
      <p className="mt-3 text-body text-secondary">
        A direct support channel is coming soon. In the meantime, here&rsquo;s what most questions
        turn out to be.
      </p>

      <div className="mt-10 flex flex-col divide-y divide-line rounded-control border border-line bg-surface">
        {faqs.map((item) => (
          <div key={item.q} className="px-5 py-4">
            <p className="text-body font-medium text-foreground">{item.q}</p>
            <p className="mt-1.5 text-body text-secondary">{item.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
