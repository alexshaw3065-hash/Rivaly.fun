"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchResults } from "@/lib/use-search-results";
import { openSearchOverlay } from "@/lib/search-overlay-store";
import { addRecentSearch } from "@/lib/use-recent-searches";
import { SearchIcon, SlidersIcon, BookmarkIcon } from "./icons";
import { SearchRollup } from "./search-rollup";
import { SearchResultsList } from "./search-results-list";

// Home's search pill is a real inline combobox now, not a shortcut into
// the full-screen mobile overlay — per founder direction, referencing
// Polymarket's own mobile search: tapping it drops down a compact panel
// right under the bar (idle: SearchRollup; typing: live grouped results),
// so results appear in place instead of taking over the screen. Same
// component and logic DesktopSearchBox already uses, just sized for a
// narrow mobile pill instead of the header's fixed-width box. The
// advanced-filters icon and Wishlist link are untouched — they still open
// the full overlay/route, since only the bar itself was the complaint.
export function SearchBarLink() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();

  const { rooms: matchedRooms, matches: matchedMatches, people: matchedPeople } = useSearchResults(query);

  function close() {
    setOpen(false);
  }

  function goToSearch() {
    close();
    router.push("/search");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        inputRef.current?.blur();
      }
    }
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  return (
    <div className="flex items-center gap-1">
      <div ref={containerRef} className="relative min-w-0 flex-1">
        <div
          className={`flex h-11 min-w-0 items-center gap-2 rounded-full border bg-surface px-4 transition-colors duration-150 ${open ? "border-yes" : "border-line-strong"}`}
        >
          <span className="shrink-0 text-secondary [&_svg]:h-[19px] [&_svg]:w-[19px]">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                addRecentSearch(query);
                goToSearch();
              }
            }}
            placeholder="Search rooms, matches, people…"
            className="min-w-0 flex-1 bg-transparent text-body-lg text-foreground placeholder:text-tertiary focus:outline-none"
          />
        </div>

        {open && (
          <div className="enter-pop absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[70vh] overflow-y-auto rounded-card bg-surface-elevated p-4 shadow-pop">
            {!q ? (
              <SearchRollup
                compact
                onSelectRecent={(term) => {
                  addRecentSearch(term);
                  setQuery(term);
                }}
                onSelectTab={goToSearch}
                onSelectTopic={goToSearch}
              />
            ) : (
              <SearchResultsList
                compact
                query={query}
                rooms={matchedRooms}
                matches={matchedMatches}
                people={matchedPeople}
              />
            )}
          </div>
        )}
      </div>

      <button onClick={openSearchOverlay} aria-label="Advanced search" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-secondary transition-[color,background-color,transform] duration-100 hover:bg-overlay-1 hover:text-foreground active:scale-90 [&_svg]:h-[19px] [&_svg]:w-[19px]">
        <SlidersIcon />
      </button>
      <Link href="/wishlist" aria-label="Wishlist" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-secondary transition-[color,background-color,transform] duration-100 hover:bg-overlay-1 hover:text-foreground active:scale-90 [&_svg]:h-[19px] [&_svg]:w-[19px]">
        <BookmarkIcon />
      </Link>
    </div>
  );
}
