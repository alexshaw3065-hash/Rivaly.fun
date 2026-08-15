"use client";

import { useEffect } from "react";

// Reusable modal shell — the league filter uses it now; anything else that
// needs a mobile-native "slides up from the bottom" picker can reuse this
// rather than building its own overlay/scrim/escape-key handling.
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
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
      <div
        className="sheet-overlay absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="sheet-panel relative w-full max-w-lg rounded-t-2xl border-t border-border bg-surface p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "var(--border-strong)" }} />
        <h2 className="text-center font-display text-lg font-semibold text-foreground">{title}</h2>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
