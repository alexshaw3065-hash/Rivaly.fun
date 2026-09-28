import { RoomCardShape } from "@/components/loading-shapes";
import { Skeleton } from "@/components/ui";

// Create room: the four-step progress bar, the step title, the match list.
export default function CreateLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-6 pt-5 md:px-6 md:pt-8">
      <div className="flex gap-2 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-1 flex-1 rounded-full" />
        ))}
      </div>
      <Skeleton className="mt-9 h-8 w-2/3" />
      <div className="mt-6 flex flex-col gap-3">
        <RoomCardShape />
        <RoomCardShape />
        <RoomCardShape />
      </div>
    </main>
  );
}
