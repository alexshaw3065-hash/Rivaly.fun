import { ChipsShape, PostShape, TabsShape } from "@/components/loading-shapes";
import { Card, Skeleton } from "@/components/ui";

// Arena: Feed/Leagues/Leaderboard, Global/Following, chips, the composer, posts.
export default function ArenaLoading() {
  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 py-6 md:px-6 md:py-12">
      <TabsShape />
      <div className="mt-5">
        <TabsShape count={2} />
      </div>
      <div className="mt-4">
        <ChipsShape />
      </div>
      <Card className="mt-6 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-9 w-16 rounded-full" />
      </Card>
      <div className="mt-4 flex flex-col gap-3">
        <PostShape />
        <PostShape />
      </div>
    </main>
  );
}
