"use client";

import { useSavedRoomIds, toggleSavedRoom } from "@/lib/use-saved-rooms";

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill={filled ? "currentColor" : "none"} aria-hidden>
      <path d="M5.5 3.5h9a1 1 0 0 1 1 1V17l-5.5-3.4L4 17V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// The save/wishlist affordance seen on every Polymarket card — bare mark,
// no filled tile, matches the rest of the app's icon-free-by-default
// language (see top-bar-icons.tsx for the same drawing convention).
export function BookmarkButton({ roomId }: { roomId: string }) {
  const saved = useSavedRoomIds().includes(roomId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSavedRoom(roomId);
      }}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={saved}
      className="shrink-0 p-0.5 active:scale-[0.9]"
      style={{
        color: saved ? "var(--rival-blue)" : "var(--muted)",
        transition: "transform 150ms ease-out, color 150ms ease",
      }}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}
