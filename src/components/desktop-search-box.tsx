"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchResults } from "@/lib/use-search-results";
import { SearchIcon } from "./icons";
import { SearchRollup } from "./search-rollup";
import { SearchResultsList } from "./search-results-list";
import { addRecentSearch } from "@/lib/use-recent-searches";

// The desktop header's search pill, upgraded from a plain Link into a real
// inline combobox — Polymarket's own desktop search behaves this way
// (dropdown under the bar, not a page nav). Typing shows live grouped
// results right here (same data/logic as Search's query mode, just
// capped — see SearchResultsList's `compact`); empty shows the same
// SearchRollup Search uses for its idle state. Tapping a browse chip or
// topic still goes to /search (RoomFeed's full filtering doesn't belong
// crammed into a dropdown) — picking a recent just fills the box so
// results appear right here without leaving the page.
export function DesktopSearchBox() {
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

  // "/" focuses search from anywhere on desktop (the hint in the pill
  // promises this), Escape closes, and a click outside the box closes it —
  // the three affordances any dropdown/combobox needs to feel native.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/") {
        const target = e.target as HTMLElement | null;
        const alreadyTyping =
          target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        if (!alreadyTyping) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      } else if (e.key === "Escape") {
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
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className={`flex h-10 w-full items-center gap-2 rounded-full border bg-surface px-4 text-body transition-colors duration-150 ${open ? "border-yes" : "border-line-strong"}`}>
        <span className="shrink-0 text-secondary">
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
          className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-tertiary focus:outline-none"
        />
        {!query && (
          <span className="shrink-0 rounded-tag px-1.5 py-0.5 text-micro font-semibold text-tertiary edge-strong">
            /
          </span>
        )}
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
  );
}
