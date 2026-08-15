"use client";

import { useState } from "react";
import type { EntrySide } from "@/lib/types";
import { formatMoney } from "@/lib/mock-data";

export function JoinPanel({ entryAmountCents }: { entryAmountCents: number }) {
  const [side, setSide] = useState<EntrySide | null>(null);
  const [joined, setJoined] = useState(false);

  if (joined && side) {
    return (
      <div className="enter-pop rounded-lg border border-border-strong bg-surface p-4">
        <p className="text-sm font-medium text-foreground">
          You&rsquo;re in — backing{" "}
          <span className={side === "yes" ? "text-rival-blue" : "text-rival-green"}>
            {side === "yes" ? "Yes" : "No"}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted">{formatMoney(entryAmountCents)} entered escrow.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Take a side</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("yes")}
          className="rounded-md border py-3 text-sm font-medium active:scale-[0.97]"
          style={{
            borderColor: side === "yes" ? "var(--rival-blue)" : "var(--border)",
            color: side === "yes" ? "var(--rival-blue)" : "var(--foreground)",
            background: side === "yes" ? "var(--rival-blue-dim)" : "transparent",
            transition:
              "transform 150ms ease-out, background-color 150ms ease, border-color 150ms ease, color 150ms ease",
          }}
        >
          Yes
        </button>
        <button
          onClick={() => setSide("no")}
          className="rounded-md border py-3 text-sm font-medium active:scale-[0.97]"
          style={{
            borderColor: side === "no" ? "var(--rival-green)" : "var(--border)",
            color: side === "no" ? "var(--rival-green)" : "var(--foreground)",
            background: side === "no" ? "var(--rival-green-dim)" : "transparent",
            transition:
              "transform 150ms ease-out, background-color 150ms ease, border-color 150ms ease, color 150ms ease",
          }}
        >
          No
        </button>
      </div>
      <button
        onClick={() => side && setJoined(true)}
        disabled={!side}
        className="mt-3 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
      >
        Join for {formatMoney(entryAmountCents)}
      </button>
    </div>
  );
}
