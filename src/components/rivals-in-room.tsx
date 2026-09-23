// The room's real participant count. Avatars used to come from the mock
// roster's seeded entries; with mock rooms gone there are no faces to show
// without an extra query per card, and inventing them isn't an option.
export function RivalsInRoom({ participantCount }: { roomId?: string; participantCount: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {participantCount} {participantCount === 1 ? "rival" : "rivals"}
    </span>
  );
}
