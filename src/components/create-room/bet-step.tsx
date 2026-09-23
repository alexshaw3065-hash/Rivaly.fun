"use client";

import { formatMoney } from "@/lib/mock-data";
import type { EntrySide, Match } from "@/lib/types";
import { limitsLabel, type StakeLimits } from "./room-settings";
import { MatchBanner } from "./match-hero";
import { CheckIcon } from "./market-icons";

const QUICK_STAKES_DOLLARS = [5, 10, 25, 50, 100];

export function stakeError(stakeCents: number, limits: StakeLimits): string | null {
  if (!stakeCents) return "Enter your stake.";
  if (stakeCents < limits.minCents) return `Minimum in this room is ${formatMoney(limits.minCents)}.`;
  if (limits.maxCents !== null && stakeCents > limits.maxCents) return `Max in this room is ${formatMoney(limits.maxCents)}.`;
  return null;
}

const SIDE = {
  yes: { label: "YES", color: "var(--rival-blue)", dim: "var(--rival-blue-dim)" },
  no: { label: "NO", color: "var(--rival-green)", dim: "var(--rival-green-dim)" },
} as const;

/**
 * The room as other people will meet it — both crests over their kit
 * colours, the claim, and the two sides. Interactive during the stake step
 * (tap a side), then the same card settles into its confirmed state once the
 * server has actually created the room, so "what I built" and "what exists"
 * are visibly one object.
 */
export function RoomPreviewCard({
  match,
  claim,
  side,
  onSide,
  meta,
  confirmed = false,
}: {
  match: Match;
  claim: string;
  side: EntrySide;
  onSide?: (side: EntrySide) => void;
  meta: string[];
  confirmed?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-surface ${confirmed ? "room-confirmed" : ""}`}
      style={{ borderColor: confirmed ? SIDE[side].color : "var(--border)" }}
    >
      <MatchBanner match={match} size="sm" />
      <div className="border-t border-border p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">The call</p>
        <p className="mt-1 font-display text-2xl font-bold leading-tight text-foreground md:text-[28px]">{claim}</p>

        <div className="mt-4 grid grid-cols-2 gap-2" role={onSide ? "radiogroup" : undefined} aria-label={onSide ? "Your side" : undefined}>
          {(["yes", "no"] as const).map((s) => {
            const active = side === s;
            const content = (
              <>
                <span className="font-display text-lg font-bold tracking-wide">{SIDE[s].label}</span>
                {active && (
                  <span className="enter-pop flex items-center gap-1 text-[11px] font-semibold">
                    <CheckIcon className="h-3 w-3" />
                    {confirmed ? "Your side" : "You"}
                  </span>
                )}
              </>
            );
            const style = {
              borderColor: active ? SIDE[s].color : "var(--border)",
              background: active ? SIDE[s].dim : "transparent",
              color: active ? SIDE[s].color : "var(--muted)",
              boxShadow: active ? `inset 0 0 0 1px ${SIDE[s].color}` : "none",
            };
            const cls =
              "flex min-h-14 items-center justify-center gap-2 rounded-lg border transition-[transform,background-color,border-color,color] duration-150 ease-out";
            return onSide ? (
              <button key={s} type="button" role="radio" aria-checked={active} onClick={() => onSide(s)} className={`${cls} active:scale-[0.97]`} style={style}>
                {content}
              </button>
            ) : (
              <div key={s} className={cls} style={style}>
                {content}
              </div>
            );
          })}
        </div>

        <p className="mt-3.5 text-xs leading-relaxed text-muted">{meta.join(" · ")}</p>
      </div>
      {confirmed && <span aria-hidden className="confirm-sweep" />}
    </div>
  );
}

export function StakeInput({
  valueDollars,
  onChange,
  limits,
  error,
  side,
}: {
  valueDollars: string;
  onChange: (v: string) => void;
  limits: StakeLimits;
  error: string | null;
  side: EntrySide;
}) {
  const inRange = QUICK_STAKES_DOLLARS.filter(
    (n) => n * 100 >= limits.minCents && (limits.maxCents === null || n * 100 <= limits.maxCents),
  );
  const quick = inRange.length
    ? inRange
    : [limits.minCents / 100, ...(limits.maxCents !== null ? [limits.maxCents / 100] : [])];
  const accent = SIDE[side].color;
  const showError = Boolean(error && valueDollars);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="stake" className="text-sm font-semibold text-foreground">
          Your stake
        </label>
        <span className="text-xs text-muted">{limitsLabel(limits)}</span>
      </div>
      <div
        className="mt-2.5 flex min-h-16 items-center gap-2 rounded-lg border bg-surface px-4 transition-colors duration-150"
        style={{ borderColor: showError ? "var(--danger-red)" : accent }}
      >
        <span className="font-display text-2xl font-bold" style={{ color: accent }}>
          $
        </span>
        <input
          id="stake"
          value={valueDollars ? Number(valueDollars).toLocaleString("en-US") : ""}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 7))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          aria-invalid={showError}
          aria-describedby="stake-error"
          className="min-w-0 flex-1 bg-transparent font-display font-bold tabular-nums text-foreground placeholder:text-muted focus:outline-none"
          // Inline, not text-3xl: globals.css pins inputs to 16px on mobile
          // (stops iOS focus-zoom), which would otherwise win over the class.
          style={{ fontSize: 30 }}
        />
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-muted">USDC</span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {quick.map((n) => {
          const active = Number(valueDollars) === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className="min-h-10 min-w-14 rounded-md border px-3.5 font-mono text-sm font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.96]"
              style={{
                borderColor: active ? accent : "var(--border)",
                background: active ? SIDE[side].dim : "var(--surface)",
                color: active ? accent : "var(--foreground)",
              }}
            >
              {formatMoney(n * 100)}
            </button>
          );
        })}
      </div>
      <p id="stake-error" role="alert" className="mt-2 min-h-4 text-xs">
        {showError ? (
          <span className="text-danger-red">{error}</span>
        ) : (
          <span className="text-muted">Win and you split the whole pool with everyone on your side.</span>
        )}
      </p>
    </div>
  );
}
