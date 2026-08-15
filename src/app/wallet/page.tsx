import { wallet, transactions, rooms, matchById, formatMoney, roomById } from "@/lib/mock-data";
import { WalletActions } from "@/components/wallet-actions";
import { RoomCard } from "@/components/room-card";

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
  const currentRooms = rooms.filter((r) => r.status === "open" || r.status === "live");
  const completedRooms = rooms.filter((r) => r.status === "settled");

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

      {currentRooms.length > 0 && (
        <div className="mt-10">
          <p className="font-display text-xl font-semibold text-foreground">Current rooms</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentRooms.map((room) => (
              <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
            ))}
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

      {completedRooms.length > 0 && (
        <div className="mt-10">
          <p className="font-display text-xl font-semibold text-foreground">Completed rooms</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedRooms.map((room) => (
              <RoomCard key={room.id} room={room} match={matchById(room.matchId)!} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
