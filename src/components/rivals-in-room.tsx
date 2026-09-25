"use client";

import { useRoomFaces } from "@/lib/use-room-faces";
import { RivalCharacter } from "./rival-character";

// Who's in the room: up to three little faces (biggest stakes first) and the
// head-count. Real people only — faces load in one batched query for every
// card on screen (use-room-faces.ts); until they arrive, or for a room
// nobody's in yet, it's just the count.
export function RivalsInRoom({ roomId, participantCount }: { roomId?: string; participantCount: number }) {
  const faces = useRoomFaces(roomId, participantCount);
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {faces.length > 0 && (
        <span aria-hidden className="flex -space-x-1.5">
          {faces.map((f, i) => (
            <span key={i} className="enter-pop rounded-full ring-2 ring-surface" style={{ transitionDelay: `${i * 50}ms` }}>
              <RivalCharacter name={f.name} imageUrl={f.avatarUrl} size={18} />
            </span>
          ))}
        </span>
      )}
      {participantCount} {participantCount === 1 ? "rival" : "rivals"}
    </span>
  );
}
