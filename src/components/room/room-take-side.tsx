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
}: {
  roomId: string;
  minStakeCents: number;
  maxStakeCents: number | null;
  returnPath: string;
  preselect: EntrySide | null;
  canCall?: boolean;
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
    />
  );

  return (
    <>
      {/* Desktop: inline in the side column */}
      <div className="hidden md:block">{panel(preselect)}</div>

      {/* Phone: the stake sheet */}
      <Drawer.Root open={sheetSide !== null} onOpenChange={(open) => !open && setSheetSide(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 md:hidden" />
          <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-40 max-h-[92dvh] rounded-t-[20px] border-t border-border bg-background outline-none md:hidden">
            <Drawer.Title className="sr-only">Take a side</Drawer.Title>
            <Drawer.Handle className="!mx-auto !mt-2.5 !mb-2 !h-1.5 !w-10 !rounded-full !bg-border-strong" />
            <div className="max-h-[calc(92dvh-24px)] overflow-y-auto px-4 pb-8">{sheetSide && panel(sheetSide)}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

    </>
  );
}
