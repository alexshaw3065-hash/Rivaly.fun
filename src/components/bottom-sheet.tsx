"use client";

import { useEffect } from "react";

// Reusable modal shell — the league filter uses it now; anything else that
// needs a mobile-native "slides up from the bottom" picker can reuse this
// rather than building its own overlay/scrim/escape-key handling.
export function BottomSheet({
  open,
  onClose,
  title,
  headerAction,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  // Optional right-aligned action next to the title (e.g. a "Save" button)
  // — every existing caller keeps its centered-title-only look unchanged.
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <div className="sheet-overlay absolute inset-0 bg-scrim" onClick={onClose} aria-hidden />
      <div className="sheet-panel relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-sheet bg-surface p-5 pb-[max(env(safe-area-inset-bottom),24px)] shadow-sheet">
        <div className="mx-auto -mt-3 mb-4 h-1 w-9 rounded-full bg-line-strong" />
        <div className="relative flex items-center justify-center">
          <h2 className="text-title-3 font-display text-foreground">{title}</h2>
          {headerAction && <div className="absolute right-0">{headerAction}</div>}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
