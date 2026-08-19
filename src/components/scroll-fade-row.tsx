import type { ReactNode } from "react";

// Wraps any horizontally-scrolling row (pass the row's own classes through
// `className`, exactly as it was on the bare div before) with a right-edge
// fade signaling more content continues off-screen — see .scroll-fade-edge
// in globals.css for why this is a real overlay element rather than a
// mask-image on the scrolling content itself.
export function ScrollFadeRow({
  className,
  wrapperClassName,
  children,
}: {
  className: string;
  wrapperClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative min-w-0 ${wrapperClassName ?? ""}`}>
      <div className={className}>{children}</div>
      <div className="scroll-fade-edge pointer-events-none absolute inset-y-0 right-0 w-8" aria-hidden />
    </div>
  );
}
