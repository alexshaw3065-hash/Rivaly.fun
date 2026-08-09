import { PageShell } from "@/components/page-shell";

// A core network effect for V1, not a nice-to-have — see
// docs/masterplan/08-v1-scope.md. Feed per
// docs/masterplan/07-product-blueprint.md#413-following: New Rooms, Friends
// Online, Challenges, Big Wins.
export default function FollowingPage() {
  return (
    <PageShell
      title="Following"
      purpose="What the creators and friends you follow are doing right now."
    >
      <p className="text-sm text-muted">Following feed not wired up yet.</p>
    </PageShell>
  );
}
