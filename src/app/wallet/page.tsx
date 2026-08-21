import Link from "next/link";
import {
  wallet,
  transactions,
  formatMoney,
  roomById,
  roomsByCreator,
  roomsJoinedBy,
  matchById,
  SELF_USER_ID,
} from "@/lib/mock-data";
import { WalletActions } from "@/components/wallet-actions";
import { LiveBadge } from "@/components/live-badge";

// Per docs/masterplan/07-product-blueprint.md#48-wallet — often overlooked
// but critical to trust. The user should never wonder "where is my money?"
// See docs/masterplan/09-competitive-research.md#5.2c.
const typeLabel: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  entry: "Room entry",
  payout: "Payout",
  refund: "Refund",
  fee: "Fee",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function WalletPage() {
  const mine = [...roomsByCreator(SELF_USER_ID), ...roomsJoinedBy(SELF_USER_ID)].filter(
    (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i,
  );
  const active = mine.filter((r) => r.status !== "settled").sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const activeCount = active.length;
  const completedCount = mine.filter((r) => r.status === "settled").length;
  const preview = active.slice(0, 2);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <WalletActions initialBalanceCents={wallet.balanceCents} />

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-mono text-lg font-medium text-foreground">
            {formatMoney(wallet.pendingCents)}
          </p>
          <p className="mt-0.5 text-xs text-muted">Pending</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-mono text-lg font-medium text-foreground">
            {formatMoney(wallet.escrowCents)}
          </p>
          <p className="mt-0.5 text-xs text-muted">In escrow · active rooms</p>
        </div>
      </div>

      {/* Rooms tab (My Rooms sub-tab) is the real home for the full list —
          this card's job is different: a real preview of what's actually
          in play right now (not just a count), so opening it feels like a
          peek at a live situation rather than a static summary link.
          "Currently at play" mirrors wallet.escrowCents exactly — the same
          number the stat card above already shows, never a second figure
          that could quietly disagree with it. */}
      {mine.length > 0 && (
        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">Your rooms</p>
              <p className="mt-0.5 text-xs text-muted">
                {activeCount} active · {completedCount} completed
              </p>
            </div>
            <Link href="/rooms?tab=mine" className="hover-link text-sm font-medium text-rival-blue transition-colors">
              View all →
            </Link>
          </div>

          {preview.length > 0 ? (
            <div className="flex flex-col divide-y divide-border">
              {preview.map((room) => {
                const match = matchById(room.matchId);
                return (
                  <Link
                    key={room.id}
                    href={`/rooms/${room.id}`}
                    className="hover-border flex items-center justify-between gap-3 px-5 py-3.5 transition-colors duration-150 active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{room.prediction}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">{match?.competition}</p>
                    </div>
                    {match?.status === "live" ? (
                      <LiveBadge />
                    ) : (
                      <span className="shrink-0 text-xs text-muted">{room.participantCount} rivals</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-muted">No active rooms right now.</p>
          )}

          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ background: "var(--surface-elevated)" }}
          >
            <span className="text-xs text-muted">Currently at play</span>
            <span className="font-mono text-sm font-medium text-foreground">{formatMoney(wallet.escrowCents)}</span>
          </div>
        </div>
      )}

      <div className="mt-10">
        <p className="font-display text-xl font-semibold text-foreground">Transaction history</p>
        <div className="mt-4 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {transactions.map((tx) => {
            const room = tx.roomId ? roomById(tx.roomId) : undefined;
            const positive = tx.amountCents >= 0;
            return (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{typeLabel[tx.type]}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted">
                    {room ? room.prediction : formatDate(tx.createdAt)}
                  </p>
                </div>
                <p
                  className="shrink-0 font-mono text-sm font-medium"
                  style={{ color: positive ? "var(--rival-green)" : "var(--foreground)" }}
                >
                  {positive ? "+" : "−"}
                  {formatMoney(Math.abs(tx.amountCents))}
                </p>
              </div>
            );
          })}
        </div>
      </div>

    </main>
  );
}
