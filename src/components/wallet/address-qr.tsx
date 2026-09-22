"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

// Scanners need a clear margin around the symbol to find it — without this
// the code still renders but reads unreliably when it sits flush against
// surrounding UI.
const QUIET_ZONE = 2;

// qrcode-generator rather than the more popular `qrcode`: it has zero
// runtime dependencies and ships its own types, where `qrcode` drags in
// pngjs/yargs/dijkstrajs for its CLI and PNG renderers — none of which a
// browser bundle needs, and whose presence in the module graph
// reproducibly crashed webpack's WasmHash during `next build`.
//
// Synchronous, so this renders in one pass with no effect, no loading
// state and nothing to hydrate — worth preferring over the async
// toDataURL/toString APIs, which would put a spinner in front of a
// deposit address.
export function AddressQr({ value, size = 196 }: { value: string; size?: number }) {
  const { path, dimension } = useMemo(() => {
    // 0 = pick the smallest version that fits; "M" = ~15% error correction,
    // the usual default and plenty for an address on a screen.
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();

    const count = qr.getModuleCount();
    // One <path> of 1-unit squares rather than ~1,000 <rect> nodes.
    let d = "";
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) {
          d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
        }
      }
    }
    return { path: d, dimension: count + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${dimension} ${dimension}`}
      width={size}
      height={size}
      // crispEdges keeps module boundaries hard — anti-aliased edges are a
      // real cause of failed scans at small sizes.
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code for your deposit address"
    >
      {/* Fixed black-on-white regardless of theme, on purpose: a QR inverted
          for dark mode fails to scan on a lot of phone cameras. This is a
          functional constraint, not a theming oversight. */}
      <rect width={dimension} height={dimension} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
