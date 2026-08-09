import { PageShell } from "@/components/page-shell";

// Fields per docs/masterplan/07-product-blueprint.md#46-create-room:
// Prediction, Entry amount, Visibility (Private/Public), Invite Link, Match,
// Settlement, Preview, Create. Should take seconds — see
// docs/masterplan/04-design-principles.md#62-fast.
export default function CreateRoomPage() {
  return (
    <PageShell
      title="Create Room"
      purpose="Throw down the challenge. Should take seconds, not feel like a form."
    >
      <p className="text-sm text-muted">Room creation form not wired up yet.</p>
    </PageShell>
  );
}
