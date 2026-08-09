import { PageShell } from "@/components/page-shell";

// The heart of the product. Per docs/masterplan/07-product-blueprint.md#45-room:
// Header, Prediction cards, Pool, Participants, Chat, Timeline, Share, Invite,
// Leave, Pinned messages, Room Rules, Creator, Moderation, Match Finished,
// Settlement, Rematch. Emotional beats per docs/masterplan/06-emotion-design.md.
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  return (
    <PageShell title="Room" purpose={`Room ${roomId} — not wired up yet.`}>
      <p className="text-sm text-muted">
        Chat, pool, predictions, and settlement will live here.
      </p>
    </PageShell>
  );
}
