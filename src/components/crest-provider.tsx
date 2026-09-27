"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { crestKey } from "@/lib/crests/key";
import { EMPTY_CRESTS, type CrestMap } from "@/lib/crests/map-types";

// Real badges (src/lib/crests/): the map arrives once with the page, so a
// crest never waits on a lookup — only on its own small, CDN-cached image.
const CrestContext = createContext<CrestMap>(EMPTY_CRESTS);

export function CrestProvider({ map, children }: { map: CrestMap; children: React.ReactNode }) {
  return <CrestContext.Provider value={map}>{children}</CrestContext.Provider>;
}

export function useCrestUrl(kind: "team" | "league", name: string | null | undefined): string | null {
  const map = useContext(CrestContext);
  if (!name || !map.base) return null;
  const path = map[kind][crestKey(name)];
  return path ? map.base + path : null;
}

/**
 * The badge over its placeholder. State lives on the DOM (data-state), not
 * in React, so loading never re-renders anything: CSS in globals.css shows
 * the placeholder only if the image isn't there within ~180ms (so a cached
 * badge never flashes the monogram), hides it once the image loads, and
 * keeps it if the image fails. No placeholder → nothing shows until loaded.
 */
export function CrestImage({
  src,
  alt,
  width,
  height,
  className = "",
  children,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const settle = (img: HTMLImageElement, ok: boolean) => {
    const box = img.parentElement;
    if (box) box.dataset.state = ok ? "loaded" : "error";
  };
  // An image that finished before hydration fired its load event before
  // React was listening — read its state once mounted.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete) settle(img, img.naturalWidth > 0);
  }, []);
  return (
    <span className={`crest relative inline-block shrink-0 ${className}`} data-state="loading" style={{ width, height }}>
      {children && <span className="crest-fallback absolute inset-0">{children}</span>}
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized 128px WebP on our CDN; the image optimizer would only add latency */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={(e) => settle(e.currentTarget, true)}
        onError={(e) => settle(e.currentTarget, false)}
        className="crest-img absolute inset-0 h-full w-full object-contain"
      />
    </span>
  );
}
