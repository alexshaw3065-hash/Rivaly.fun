"use client";

import { useEffect, useRef } from "react";

// Money and numbers in the UI font with fixed-width digits (tabular-nums) —
// never monospace — so values don't jiggle as they change. With `countUp`,
// a change rolls smoothly from the old value to the new one (450ms, Emil's
// curve), written straight to the DOM so nothing re-renders per frame; with
// reduced motion it just switches.

const fmt = (cents: number, signed: boolean) => {
  const abs = Math.abs(cents) / 100;
  const body = `$${abs.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(abs) ? 0 : 2, maximumFractionDigits: 2 })}`;
  if (!signed) return cents < 0 ? `−${body}` : body;
  return cents > 0 ? `+${body}` : cents < 0 ? `−${body}` : body;
};

export function Amount({
  cents,
  signed = false,
  countUp = false,
  tone = "default",
  className = "",
}: {
  cents: number;
  signed?: boolean;
  countUp?: boolean;
  tone?: "default" | "money" | "yes" | "no" | "secondary";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(cents);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = shown.current;
    const to = cents;
    shown.current = to;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!countUp || from === to || reduce) {
      el.textContent = fmt(to, signed);
      return;
    }
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 4); // close to cubic-bezier(0.23,1,0.32,1)
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 450);
      el.textContent = fmt(Math.round(from + (to - from) * ease(t)), signed);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cents, signed, countUp]);

  const color = { default: "", money: "text-money-ink", yes: "text-yes-ink", no: "text-no-ink", secondary: "text-secondary" }[tone];
  return (
    <span ref={ref} className={`tabular-nums ${color} ${className}`}>
      {fmt(cents, signed)}
    </span>
  );
}
