import { FeatureCardShape, RoomCardShape, TitleShape } from "@/components/loading-shapes";
import { Skeleton } from "@/components/ui";

// The instant screen for any route without its own loading.tsx — and Home,
// which it's shaped like (search bar, Exploding now, the feed). Every route
// is dynamic (the root layout reads the session), so without this a tap
// waits on the server with nothing on screen.
export default function Loading() {
  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 py-6 md:px-6">
      <Skeleton className="h-11 rounded-full" />
      <div className="mt-6 flex flex-col gap-4">
        <TitleShape wide />
        <FeatureCardShape />
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <TitleShape />
        <RoomCardShape />
        <RoomCardShape />
      </div>
    </main>
  );
}
