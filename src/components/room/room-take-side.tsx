"use client";

import { useEffect } from "react";
import { Drawer } from "vaul";
import type { EntrySide } from "@/lib/types";
import { openStakeSheet, useStakeSheet } from "@/lib/stake-sheet-store";
import { JoinPanel } from "../join-panel";

// Taking a side. On a phone, the pool card's "Back YES / Back NO" buttons
// open this stake sheet with that side picked; on desktop the same panel
// sits in the side column. Coming back from sign-in with ?side= re-opens
// the sheet to finish.
export function RoomTakeSide({
  roomId,
  minStakeCents,
  maxStakeCents,
  returnPath,
  preselect,
  canCall = false,
  pool = null,
}: {
  roomId: string;
  minStakeCents: number;
  maxStakeCents: number | null;
  returnPath: string;
  preselect: EntrySide | null;
  canCall?: boolean;
  pool?: { yesCents: number; noCents: number; feeBps: number; hostFeeBps: number } | null;
}) {
  const sheetSide = useStakeSheet();
  const setSheetSide = openStakeSheet;
  // Back from sign-in with a side picked: re-open the sheet on it.
  useEffect(() => {
    if (preselect) openStakeSheet(preselect);
    return () => openStakeSheet(null);
  }, [preselect]);

  const panel = (side: EntrySide | null) => (
    <JoinPanel
      key={side ?? "none"}
      roomId={roomId}
      minStakeCents={minStakeCents}
      maxStakeCents={maxStakeCents}
      initialSide={side}
      returnPath={returnPath}
      canCall={canCall}
      pool={pool}
    />
  );

  return (
    <>
      {/* Desktop: inline in the side column */}
      <div className="hidden md:block">{panel(preselect)}</div>

      {/* Phone: the stake sheet */}
      <Drawer.Root open={sheetSide !== null} onOpenChange={(open) => !open && setSheetSide(null)} repositionInputs={false}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim md:hidden" />
          <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-40 max-h-[92dvh] rounded-t-sheet bg-background shadow-sheet outline-none md:hidden">
            <Drawer.Title className="sr-only">Take a side</Drawer.Title>
            <Drawer.Handle className="!mx-auto !mt-2 !mb-3 !h-1 !w-9 !rounded-full !bg-line-strong" />
            <div className="max-h-[calc(92dvh-24px)] overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),24px)]">{sheetSide && panel(sheetSide)}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

    </>
  );
}
