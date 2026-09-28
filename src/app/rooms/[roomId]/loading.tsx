import { Card, Skeleton } from "@/components/ui";

// Shown the instant a room is tapped (and prefetched with the link), shaped
// like the room: the stadium and timeline, the pool, then the tabs.
export default function RoomLoading() {
  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto max-w-5xl px-4 pb-10 md:px-6 md:pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_340px] md:gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="stadium-art -mx-4 overflow-hidden bg-[var(--st-pitch-1)] md:mx-0 md:rounded-card">
              <div className="h-[148px] bg-[var(--st-stand)]" />
              <div className="flex flex-col items-center gap-4 px-4 pb-6 pt-4">
                <Skeleton className="h-12 w-40" />
                <Skeleton className="h-6 w-3/4 self-start" />
                <Skeleton className="h-4 w-1/3 self-start" />
              </div>
              <div className="h-[62px] border-t border-line bg-scrim" />
            </div>
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-6 w-14" />
                </div>
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-6 w-14" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-[72px]" />
                <Skeleton className="h-[72px]" />
              </div>
            </Card>
            <Skeleton className="h-12 rounded-full" />
          </div>
          <aside className="hidden md:block">
            <Card className="h-64" />
          </aside>
        </div>
      </div>
    </main>
  );
}
