"use client";

import { CrestImage, useCrestUrl } from "./crest-provider";

// A competition's real badge, sized to sit beside its name. Without one (or
// if it fails to load) it shows `fallback` — e.g. the sport icon — or
// nothing; the name alone still reads.
export function LeagueMark({
  name,
  size = 14,
  className = "",
  fallback = null,
}: {
  name: string | null | undefined;
  size?: number;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const src = useCrestUrl("league", name);
  if (!src || !name) return <>{fallback}</>;
  return (
    <CrestImage src={src} alt="" width={size} height={size} className={className}>
      {fallback}
    </CrestImage>
  );
}
