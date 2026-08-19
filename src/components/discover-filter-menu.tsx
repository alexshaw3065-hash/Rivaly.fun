"use client";

import { useEffect, useRef, useState } from "react";
import { filters, type FilterTab } from "./room-feed";
import { ChevronDownIcon } from "./icons";

// The founder's pump.fun reference: the active filter shows as its own
// pill, and everything else lives behind a "More" dropdown instead of a
// six-wide horizontal scroll — single-select, one at a time. Discover-only;
// Search/Home keep RoomFeed's own chip row untouched (see room-feed.tsx's
// hideChips prop).
export function DiscoverFilterMenu({
  selected,
  onSelect,
}: {
  selected: FilterTab;
  onSelect: (tab: FilterTab) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = filters.find((f) => f.id === selected)!;
  const rest = filters.filter((f) => f.id !== selected);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <span
        className="shrink-0 rounded-full border px-3.5 py-1.5 text-sm"
        style={{ borderColor: "var(--foreground)", color: "var(--foreground)", background: "var(--surface-elevated)" }}
      >
        {active.label}
      </span>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-muted transition-colors duration-150"
        style={{ transition: "transform 150ms ease-out, border-color 150ms ease" }}
      >
        More
        <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease-out" }}>
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <div
          className="enter-pop absolute left-0 top-full z-10 mt-2 w-52 overflow-hidden rounded-lg border border-border bg-surface-elevated py-1.5 shadow-lg"
          role="listbox"
        >
          {rest.map((f) => (
            <button
              key={f.id}
              role="option"
              aria-selected={false}
              onClick={() => {
                onSelect(f.id);
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-foreground transition-colors duration-150 hover:bg-surface"
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
