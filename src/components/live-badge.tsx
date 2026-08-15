/**
 * A solid dot with a slow opacity pulse — the pulse is a real state signal
 * (this match is live right now), not decoration, so it stays small and
 * calm rather than a glowing halo. See docs/design-references/anti-slop-design-law.md.
 */
export function LiveBadge({ minute }: { minute?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-danger-red">
      <span className="h-1.5 w-1.5 rounded-full bg-danger-red motion-safe:animate-[live-pulse_1.8s_ease-in-out_infinite]" />
      Live{minute ? ` · ${minute}` : ""}
    </span>
  );
}
