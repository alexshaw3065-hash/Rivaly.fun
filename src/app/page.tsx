import { PageShell } from "@/components/page-shell";

// Sections per docs/masterplan/07-product-blueprint.md#43-home:
// Hero Match, Live Matches, Trending Rooms, Friends Playing, Following,
// Big Wins, Creator Rooms, Weekend Highlights.
export default function Home() {
  return (
    <PageShell
      title="Home"
      purpose="Everything visible at a glance: live matches, trending rooms, what friends are playing."
    >
      <p className="text-sm text-muted">Room and match data not wired up yet.</p>
    </PageShell>
  );
}
