"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Drawer } from "vaul";
import { formatMoney, formatMoneyCompact } from "@/lib/mock-data";
import type { RoomRival } from "@/lib/supabase/entries";
import type { EntrySide } from "@/lib/types";
import { RivalCharacter } from "../rival-character";

// Everyone in the room, from tapping the faces under the pool: both sides,
// biggest stake first, each a real person you can open. Named rivals and
// their money rather than a count (engagement mechanism #5, social identity).

const SIDES = {
  yes: { label: "YES", color: "var(--yes)" },
  no: { label: "NO", color: "var(--no)" },
} as const;

export function RoomPeopleSheet({
  open,
  side,
  rivals,
  onOpenChange,
}: {
  open: boolean;
  /** The side whose faces were tapped — the sheet opens on it. */
  side: EntrySide;
  rivals: RoomRival[];
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<EntrySide>(side);
  // Opening from the other side's faces switches to it.
  const [lastSide, setLastSide] = useState(side);
  if (side !== lastSide) {
    setLastSide(side);
    setTab(side);
  }

  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const bySide = {
    yes: rivals.filter((r) => r.side === "yes").sort((a, b) => b.amountCents - a.amountCents),
    no: rivals.filter((r) => r.side === "no").sort((a, b) => b.amountCents - a.amountCents),
  };
  const total = (s: EntrySide) => bySide[s].reduce((sum, r) => sum + r.amountCents, 0);
  const people = bySide[tab];

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-lg flex-col rounded-t-sheet bg-background shadow-sheet outline-none"
        >
          <Drawer.Handle className="!mx-auto !mt-2 !mb-1 !h-1 !w-9 shrink-0 !rounded-full !bg-line-strong" />
          <div className="flex items-center justify-between px-4 pb-3 pt-2">
            <Drawer.Title className="text-title-3 font-display text-foreground">In the room</Drawer.Title>
            <span className="flex items-center gap-2">
              {/* A few faces from the room, biggest stakes first */}
              <span aria-hidden className="flex -space-x-1.5">
                {[...rivals]
                  .sort((x, y) => y.amountCents - x.amountCents)
                  .slice(0, 3)
                  .map((r) => (
                    <span key={r.userId} className="rounded-full ring-2 ring-background">
                      <RivalCharacter name={r.displayName} imageUrl={r.avatarUrl} size={20} />
                    </span>
                  ))}
              </span>
              <span className="text-caption tabular-nums text-secondary">
                {rivals.length} {rivals.length === 1 ? "rival" : "rivals"}
              </span>
            </span>
          </div>

          <div role="tablist" aria-label="Side" className="mx-4 grid grid-cols-2 gap-1 rounded-control bg-surface p-1 edge">
            {(["yes", "no"] as const).map((s) => (
              <button
                key={s}
                role="tab"
                type="button"
                aria-selected={tab === s}
                onClick={() => setTab(s)}
                className={`flex h-10 items-center justify-center gap-2 rounded-tag text-label font-semibold transition-colors duration-100 ${tab === s ? "bg-surface-3" : "text-secondary"}`}
                style={tab === s ? { color: SIDES[s].color } : undefined}
              >
                <span className="font-display font-extrabold">{SIDES[s].label}</span>
                <span className="text-caption tabular-nums">
                  {formatMoneyCompact(total(s))} · {bySide[s].length}
                </span>
              </button>
            ))}
          </div>

          <ul className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            {people.length === 0 && <li className="py-10 text-center text-body text-secondary">Nobody on {SIDES[tab].label} yet.</li>}
            {people.map((p, i) => {
              const row = (
                <>
                  <span className="w-5 shrink-0 text-right text-caption tabular-nums text-tertiary">{i + 1}</span>
                  <RivalCharacter name={p.displayName} imageUrl={p.avatarUrl} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-foreground">{p.displayName}</span>
                    {now > 0 && <span className="block text-caption text-secondary">backed {ago(now, +new Date(p.createdAt))}</span>}
                  </span>
                  <span className="shrink-0 text-body font-display font-bold tabular-nums text-foreground" title={formatMoney(p.amountCents)}>
                    {formatMoneyCompact(p.amountCents)}
                  </span>
                </>
              );
              return (
                <li key={p.userId} className="border-b border-line last:border-0">
                  {p.username ? (
                    <Link href={`/profile/${p.username}`} className="flex items-center gap-3 py-3 transition-opacity duration-150 active:opacity-70">
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 py-3">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function ago(now: number, at: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
