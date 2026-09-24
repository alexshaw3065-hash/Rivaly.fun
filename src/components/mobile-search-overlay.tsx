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
    <Drawer.Root open={open} onOpenChange={(next) => !next && closeSearchOverlay()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 md:hidden" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(100dvh-14px)] flex-col rounded-t-[20px] border-t border-border bg-background outline-none md:hidden"
        >
          <Drawer.Title className="sr-only">Search</Drawer.Title>
          <Drawer.Handle className="!mt-2.5 !mb-1 !h-1.5 !w-10 shrink-0 !rounded-full !bg-border-strong" />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-3">
            <SearchBody />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
