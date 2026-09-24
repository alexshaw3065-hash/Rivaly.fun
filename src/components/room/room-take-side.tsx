"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import type { EntrySide } from "@/lib/types";
import { JoinPanel } from "../join-panel";

// The room's one primary action. On a phone it's a bar pinned above the tab
// bar — YES or NO, with each side's share — and tapping a side opens the
// stake sheet with that side picked, so taking a side is two taps from
// anywhere in the room. On desktop the same panel sits in the side column.
// Coming back from sign-in with ?side= re-opens the sheet to finish.
export function RoomTakeSide({
  roomId,
  minStakeCents,
  maxStakeCents,
  returnPath,
  yesPct,
  preselect,
}: {
  roomId: string;
  minStakeCents: number;
  maxStakeCents: number | null;
  returnPath: string;
  yesPct: number;
  preselect: EntrySide | null;
}) {
  const [sheetSide, setSheetSide] = useState<EntrySide | null>(preselect);

  const panel = (side: EntrySide | null) => (
    <JoinPanel
      key={side ?? "none"}
      roomId={roomId}
      minStakeCents={minStakeCents}
      maxStakeCents={maxStakeCents}
      initialSide={side}
      returnPath={returnPath}
    />
  );

  return (
    <>
      {/* Desktop: inline in the side column */}
      <div className="hidden md:block">{panel(preselect)}</div>

      {/* Phone: pinned bar + stake sheet */}
      <div className="fixed inset-x-0 bottom-16 z-[15] border-t border-border bg-background/95 px-4 py-3 md:hidden">
        <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Take a side</p>
        <div className="grid grid-cols-2 gap-2">
          <SideButton side="yes" pct={yesPct} onClick={() => setSheetSide("yes")} />
          <SideButton side="no" pct={100 - yesPct} onClick={() => setSheetSide("no")} />
        </div>
      </div>

      <Drawer.Root open={sheetSide !== null} onOpenChange={(open) => !open && setSheetSide(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 md:hidden" />
          <Drawer.Content aria-describedby={undefined} className="stage-dark fixed inset-x-0 bottom-0 z-40 max-h-[92dvh] rounded-t-[20px] border-t border-border bg-background outline-none md:hidden">
            <Drawer.Title className="sr-only">Take a side</Drawer.Title>
            <Drawer.Handle className="!mx-auto !mt-2.5 !mb-2 !h-1.5 !w-10 !rounded-full !bg-border-strong" />
            <div className="max-h-[calc(92dvh-24px)] overflow-y-auto px-4 pb-8">{sheetSide && panel(sheetSide)}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

    </>
  );
}

function SideButton({ side, pct, onClick }: { side: EntrySide; pct: number; onClick: () => void }) {
  const yes = side === "yes";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 items-center justify-between rounded-xl px-4 font-display text-lg font-extrabold tracking-wide text-white transition-transform duration-150 ease-out active:scale-[0.96]"
      style={{ background: yes ? "var(--rival-blue)" : "var(--rival-red)" }}
    >
      {yes ? "YES" : "NO"}
      <span className="font-mono text-xs font-semibold text-white/80">{pct}%</span>
    </button>
  );
}
