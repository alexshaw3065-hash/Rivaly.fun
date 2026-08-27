import { entriesByRoom, profileById } from "@/lib/mock-data";
import { Avatar } from "./avatar";

// Same visual language as OnlineRivalsBadge (Home) — a small overlapping
// avatar stack + a count — scaled down to fit the exploding card's
// existing footer row rather than add a new one. Avatars are only ever
// real participants (sourced from actual Entry rows for this room, same
// as the room page's own "Rivals" stack); the count itself is the room's
// real participantCount. If a room has no seeded entries yet, it just
// shows the count with no avatars rather than inventing faces.
export function RivalsInRoom({ roomId, participantCount }: { roomId: string; participantCount: number }) {
  const participants = entriesByRoom(roomId)
    .map((e) => profileById(e.userId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3);

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {participants.length > 0 && (
        <span className="flex -space-x-1.5">
          {participants.map((p) => (
            <Avatar key={p.id} name={p.displayName} size={16} />
          ))}
        </span>
      )}
      <span>{participantCount} rivals</span>
    </span>
  );
}
