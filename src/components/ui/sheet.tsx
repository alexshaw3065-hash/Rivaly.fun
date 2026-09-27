"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";

// The one bottom sheet (vaul): drag down or flick to dismiss, a grab handle,
// 22px top corners, the sheet shadow, content padded clear of the home bar,
// and the page behind dimmed. Motion is vaul's iOS-style drawer curve.

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-sheet bg-surface shadow-sheet outline-none"
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong" />
          {title ? (
            <div className="px-5 pb-2 pt-4 text-center">
              <Drawer.Title className="text-title-3 font-display text-foreground">{title}</Drawer.Title>
              {description && <Drawer.Description className="mt-1 text-body text-secondary">{description}</Drawer.Description>}
            </div>
          ) : (
            <Drawer.Title className="sr-only">Sheet</Drawer.Title>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-2">{children}</div>
          {footer && <div className="shrink-0 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">{footer}</div>}
          {!footer && <div aria-hidden className="h-[env(safe-area-inset-bottom)] shrink-0" />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
