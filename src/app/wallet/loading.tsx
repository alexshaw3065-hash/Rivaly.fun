import { RowsShape } from "@/components/loading-shapes";
import { Skeleton } from "@/components/ui";

// Wallet: balance, Deposit/Withdraw, history.
export default function WalletLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <Skeleton className="h-10 w-48 md:h-12" />
      <Skeleton className="mt-2 h-4 w-28" />
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="mt-10 h-6 w-44" />
      <div className="mt-4">
        <RowsShape count={3} />
      </div>
    </main>
  );
}
