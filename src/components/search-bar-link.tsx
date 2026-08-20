"use client";

import Link from "next/link";
import { openSearchOverlay } from "@/lib/search-overlay-store";
import { SearchIcon, SlidersIcon, BookmarkIcon } from "./icons";

// Home's search area is a shortcut into the mobile search overlay (see
// mobile-search-overlay.tsx) — same three-element row as the reference
// (search pill, advanced filters, wishlist), but the first two now open
// the overlay in place rather than navigating, so dismissing it drops you
// right back on Home. Mobile-only by convention (the caller wraps this in
// md:hidden — desktop has its own search box in the header).
export function SearchBarLink() {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={openSearchOverlay}
        className="hover-border flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-3 text-sm text-muted transition-colors"
      >
        <SearchIcon />
        <span className="truncate">Search rooms, matches, people…</span>
      </button>
      <button
        onClick={openSearchOverlay}
        aria-label="Advanced search"
        className="hover-link shrink-0 text-muted transition-colors"
      >
        <SlidersIcon />
      </button>
      <Link href="/wishlist" aria-label="Wishlist" className="hover-link shrink-0 text-muted transition-colors">
        <BookmarkIcon />
      </Link>
    </div>
  );
}
