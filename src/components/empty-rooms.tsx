import { Card, EmptyState } from "./ui/surfaces";
import { ButtonLink } from "./ui/button";

// What every room surface shows when there are no real rooms to show —
// never filler. A room without opponents isn't a room, so the empty state's
// only job is to make starting one the obvious next move.
export function EmptyRooms({ title = "No rooms yet", body = "Be the first — put your call up against someone else's in seconds." }: { title?: string; body?: string }) {
  return (
    <Card padded={false}>
      <EmptyState
        title={title}
        body={body}
        action={
          <ButtonLink href="/rooms/create" variant="primary" size="lg">
            Create a room
          </ButtonLink>
        }
      />
    </Card>
  );
}
