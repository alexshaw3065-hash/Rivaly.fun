"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { matches, profiles } from "@/lib/mock-data";
import { searchRooms, usePublicRooms } from "@/lib/use-real-rooms";
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

  const { items: publicRooms } = usePublicRooms();
  const matchedRooms = useMemo(() => searchRooms(publicRooms, q), [publicRooms, q]);
  const matchedMatches = useMemo(
    () =>
      q
        ? matches.filter(
            (m) =>
              m.homeTeam.toLowerCase().includes(q) ||
              m.awayTeam.toLowerCase().includes(q) ||
              m.competition.toLowerCase().includes(q),
          )
        : [],
    [q],
  );
  const matchedPeople = useMemo(
    () =>
      q ? profiles.filter((p) => p.displayName.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)) : [],
    [q],
  );

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
    <div className="flex items-center gap-3">
      <div ref={containerRef} className="relative min-w-0 flex-1">
        <div
          className="flex min-w-0 items-center gap-2.5 rounded-full border bg-surface px-4 py-3"
          style={{ borderColor: open ? "var(--border-strong)" : "var(--border)", transition: "border-color 150ms ease" }}
        >
          <span className="shrink-0 text-muted">
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
            className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>

        {open && (
          <div
            className="enter-pop absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-surface-elevated p-4"
            style={{ boxShadow: "0 16px 40px -12px rgba(0, 0, 0, 0.5)" }}
          >
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
