import { ChipsShape, FeatureCardShape, RoomCardShape, TabsShape, TitleShape } from "@/components/loading-shapes";

// Rooms: tabs, Exploding now, filter chips, the feed.
export default function RoomsLoading() {
  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 pb-6 pt-3 md:px-6 md:py-12">
      <TabsShape count={4} />
      <div className="mt-6 flex flex-col gap-4">
        <TitleShape wide />
        <FeatureCardShape />
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <ChipsShape count={2} />
        <RoomCardShape />
        <RoomCardShape />
      </div>
    </main>
  );
}
