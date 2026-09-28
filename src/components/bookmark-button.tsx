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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 ring-1 ring-white/20 backdrop-blur-sm transition-[color,transform] duration-150 active:scale-90 [&_svg]:h-[17px] [&_svg]:w-[17px]"
        style={{ color: saved ? "#7c9bff" : "#fff" }}
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
      className={`relative shrink-0 p-0.5 transition-[transform,color] duration-100 ease-out before:absolute before:-inset-2 active:scale-[0.9] ${saved ? "text-yes-ink" : "text-secondary hover:text-foreground"}`}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}
