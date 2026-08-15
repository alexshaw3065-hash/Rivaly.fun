import Link from "next/link";
import { SearchIcon, SlidersIcon, BookmarkIcon } from "./icons";

// Home's search area is a shortcut into the real Search page, not a live
// input — same three-element row as the reference (search pill, advanced
// filters, wishlist) so the pattern reads identically in both places.
export function SearchBarLink() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/search"
        className="hover-border flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-3 text-sm text-muted transition-colors"
      >
        <SearchIcon />
        <span className="truncate">Search rooms, matches, people…</span>
      </Link>
      <Link
        href="/search"
        aria-label="Advanced search"
        className="hover-link shrink-0 text-muted transition-colors"
      >
        <SlidersIcon />
      </Link>
      <Link href="/wishlist" aria-label="Wishlist" className="hover-link shrink-0 text-muted transition-colors">
        <BookmarkIcon />
      </Link>
    </div>
  );
}
