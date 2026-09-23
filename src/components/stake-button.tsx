"use client";

import type { ReactNode } from "react";
import type { StakePhase } from "@/lib/escrow/use-stake";

const STEPS: Record<Exclude<StakePhase, "idle">, { label: string; fill: number }> = {
  preparing: { label: "Preparing your stake…", fill: 0.25 },
  confirm: { label: "Confirm in your wallet", fill: 0.55 },
  locking: { label: "Locking your stake…", fill: 0.85 },
  done: { label: "Locked", fill: 1 },
};

/**
 * The money button. Idle it's the side's colour and the call to action; once
 * tapped it narrates the real stake — preparing, waiting on the wallet's
 * confirm screen, locking on-chain, locked — with a ring that fills per
 * step. The ring only spins while something is genuinely in flight.
 */
export function StakeButton({
  phase,
  color,
  disabled,
  onClick,
  children,
}: {
  phase: StakePhase;
  color: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const step = phase === "idle" ? null : STEPS[phase];
  const busy = phase === "preparing" || phase === "locking";
  const r = 8;
  const c = 2 * Math.PI * r;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || phase !== "idle"}
      aria-live="polite"
      className="relative flex min-h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-md px-6 text-sm font-semibold text-white transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:cursor-default"
      style={{ background: color, opacity: disabled && phase === "idle" ? 0.4 : 1 }}
    >
      {step && (
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden className={busy ? "animate-spin" : undefined} style={{ animationDuration: "1.1s" }}>
          <circle cx="10" cy="10" r={r} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
          <circle
            cx="10"
            cy="10"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - step.fill)}
            transform="rotate(-90 10 10)"
            style={{ transition: "stroke-dashoffset 400ms cubic-bezier(0.23, 1, 0.32, 1)" }}
          />
          {phase === "done" && <path d="m6.5 10.3 2.3 2.2 4.7-4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
      )}
      <span>{step ? step.label : children}</span>
    </button>
  );
}
