"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/mock-data";

/**
 * A money figure that counts to its new value instead of jumping — so when a
 * rival joins and the pool grows, you see it grow. First render shows the
 * value as-is (nothing to animate from). Honours reduced motion.
 */
export function AnimatedMoney({ cents, className }: { cents: number; className?: string }) {
  const [shown, setShown] = useState(cents);
  const [bumped, setBumped] = useState(false);
  const from = useRef(cents);

  useEffect(() => {
    const start = from.current;
    from.current = cents;
    if (start === cents) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 700;
    const t0 = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const p = duration === 0 ? 1 : Math.min(1, (t - t0) / duration);
      setShown(Math.round(start + (cents - start) * (1 - Math.pow(1 - p, 3))));
      setBumped(p < 1 && cents > start);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cents]);

  return (
    <span className={className} style={{ color: bumped ? "var(--rival-green)" : undefined, transition: "color 300ms ease" }}>
      {formatMoney(shown)}
    </span>
  );
}
