"use client";

import { Drawer } from "vaul";
import { useSearchOverlayOpen, closeSearchOverlay } from "@/lib/search-overlay-store";
import { SearchBody } from "./search-body";

// Mobile search as a real bottom sheet, the way Polymarket does it (they use
// this same library, vaul): it rises over the page you were on, follows your
// finger when you drag it, and a quick flick down — or a drag past about a
// third — dismisses it, with the page dimming behind. Dragging only starts
// once the results are scrolled to the top, so scrolling a long list never
// dismisses by accident. The page underneath never unmounts.
export function MobileSearchOverlay() {
  const open = useSearchOverlayOpen();

  return (
    <Drawer.Root open={open} onOpenChange={(next) => !next && closeSearchOverlay()} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim md:hidden" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(100dvh-16px)] flex-col rounded-t-sheet bg-background shadow-sheet outline-none md:hidden"
        >
          <Drawer.Title className="sr-only">Search</Drawer.Title>
          <Drawer.Handle className="!mt-2 !mb-1 !h-1 !w-9 shrink-0 !rounded-full !bg-line-strong" />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-3">
            <SearchBody />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
