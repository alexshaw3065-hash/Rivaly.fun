import { ArenaScreen } from "@/components/arena-screen";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Arena — football takes, rivals and leaderboards",
  description:
    "The Rivaly Arena: football takes and receipts from people who put money on their calls, points-only leagues with friends, and the leaderboard of who calls it best.",
  path: "/arena",
});

// The screen itself is components/arena-screen.tsx; this wrapper only gives
// the page its title and description.
export default function ArenaPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  return <ArenaScreen searchParams={searchParams} />;
}
