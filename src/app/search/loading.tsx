import { ChipsShape, RowsShape } from "@/components/loading-shapes";
import { Skeleton } from "@/components/ui";

// Search: the box, the browse chips, results.
export default function SearchLoading() {
  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 pb-6 pt-3 md:px-6 md:pb-12 md:pt-12">
      <Skeleton className="h-11 rounded-full" />
      <div className="mt-5">
        <ChipsShape count={4} />
      </div>
      <div className="mt-6">
        <RowsShape />
      </div>
    </main>
  );
}
