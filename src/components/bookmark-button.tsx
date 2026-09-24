"use client";

import { useSavedItems, toggleSaved, isSaved, type SavedItemType } from "@/lib/use-saved-items";
import { BookmarkIcon } from "./icons";

// The save/wishlist affordance seen on every Polymarket card — bare mark,
// no filled tile, matches the rest of the app's icon-free-by-default
// language (see top-bar-icons.tsx for the same drawing convention).
// Generic over type so the same button works for rooms, matches, and
// search topics — see use-saved-items.ts.
export function BookmarkButton({
  id,
  type = "room",
  label = "item",
  variant = "bare",
}: {
  id: string;
  type?: SavedItemType;
  label?: string;
  /** "stage": the round, white button in the room's top bar, over the stadium. */
  variant?: "bare" | "stage";
}) {
  const saved = isSaved(useSavedItems(), type, id);

  if (variant === "stage") {
    return (
      <button
        type="button"
        onClick={() => toggleSaved(type, id)}
        aria-label={saved ? `Remove ${label} from watchlist` : `Add ${label} to watchlist`}
        aria-pressed={saved}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 transition-[color,transform] duration-150 active:scale-90 [&_svg]:h-[17px] [&_svg]:w-[17px]"
        style={{ color: saved ? "#7c9bff" : "rgba(255,255,255,0.85)" }}
      >
        <BookmarkIcon filled={saved} />
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(type, id);
      }}
      aria-label={saved ? `Remove ${label} from wishlist` : `Save ${label} to wishlist`}
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
