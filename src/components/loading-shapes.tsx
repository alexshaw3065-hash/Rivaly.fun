import { Card, Skeleton } from "@/components/ui";

// Building blocks for the route loading screens (app/**/loading.tsx). Each
// matches the size of the real thing it stands in for, so when content
// streams in nothing jumps.

/** Underline tabs row (Rooms, Arena). */
export function TabsShape({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-6 border-b border-line pb-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-5 w-16" />
      ))}
    </div>
  );
}

/** A row of round filter chips. */
export function ChipsShape({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`h-8 shrink-0 rounded-full ${i === 0 ? "w-24" : "w-32"}`} />
      ))}
    </div>
  );
}

/** A section title ("Exploding now", "Top rivals"). */
export function TitleShape({ wide = false }: { wide?: boolean }) {
  return <Skeleton className={`h-6 ${wide ? "w-48" : "w-32"}`} />;
}

/** The big exploding-room card. */
export function FeatureCardShape() {
  return (
    <Card padded={false} className="flex flex-col gap-4 overflow-hidden">
      <Skeleton className="h-[116px] rounded-none" />
      <div className="flex flex-col gap-4 px-5 pb-5">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </Card>
  );
}

/** A room card in a feed. */
export function RoomCardShape() {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-5 w-2/3" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </Card>
  );
}

/** A person/notification-style row list. */
export function RowsShape({ count = 4 }: { count?: number }) {
  return (
    <Card padded={false} className="flex flex-col overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`flex items-center gap-3 px-4 py-4 ${i ? "border-t border-line" : ""}`}>
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </Card>
  );
}

/** An Arena post. */
export function PostShape() {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-3/5" />
    </Card>
  );
}
