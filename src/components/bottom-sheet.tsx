"use client";

import { Drawer } from "vaul";

// The shared bottom sheet (edit profile, deposit, withdraw, follow lists,
// menus…). Built on vaul like the kit's Sheet, so it behaves like a phone's
// own: it follows your finger, a flick or a drag past a third closes it, the
// page dims behind, the keyboard pushes it up, and Escape / tapping the dim
// closes it too. Same props as before, so every caller is unchanged.
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
  return (
    <Drawer.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-sheet bg-surface shadow-sheet outline-none"
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong" />
          <div className="relative flex shrink-0 items-center justify-center px-5 pt-4">
            <Drawer.Title className="text-title-3 font-display text-foreground">{title}</Drawer.Title>
            {headerAction && <div className="absolute right-5">{headerAction}</div>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-5">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
