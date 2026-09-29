import { ArenaScreen } from "@/components/arena-screen";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Arena — football takes, rivals and leaderboards",
  description:
    "The Rivaly Arena: football takes and receipts from people who put money on their calls, points-only leagues with friends, and the leaderboard of who calls it best.",
  path: "/arena",
});

// The screen itself is components/arena-screen.tsx; this wrapper gives the
// page its title and description, and reads ?tab= so the screen starts on
// the right tab without waiting for anything.
export default async function ArenaPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return <ArenaScreen initialTab={tab === "leaderboard" || tab === "leagues" ? tab : "feed"} />;
}
