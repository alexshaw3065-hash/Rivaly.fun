import { Skeleton } from "@/components/ui";

// Shown the instant a profile is tapped, shaped like the header card:
// cover, avatar over its edge, name, handle and stats.
export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-12 pt-4 md:px-6 md:pt-12 lg:max-w-[728px]">
      <div className="overflow-hidden rounded-card bg-surface edge">
        <Skeleton className="h-44 rounded-none md:h-60" />
        <div className="relative -mt-12 px-5 pb-5">
          <div className="flex items-end justify-between">
            <span className="block h-[92px] w-[92px] rounded-full bg-surface-3 outline outline-4 outline-surface" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-7 w-1/2" />
          <Skeleton className="mt-2 h-4 w-1/3" />
          <div className="mt-4 flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
      <Skeleton className="mt-6 h-40 rounded-card" />
    </main>
  );
}
