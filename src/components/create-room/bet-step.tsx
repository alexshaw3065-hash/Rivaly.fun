"use client";

import { formatMoney } from "@/lib/mock-data";
import type { EntrySide, Match } from "@/lib/types";
import { limitsLabel, type StakeLimits } from "./room-settings";
import { MatchBanner } from "./match-hero";
import { CheckIcon } from "./market-icons";
import { SidePill } from "../ui/controls";

const QUICK_STAKES_DOLLARS = [5, 10, 25, 50, 100];

export function stakeError(stakeCents: number, limits: StakeLimits): string | null {
  if (!stakeCents) return "Enter your stake.";
  if (stakeCents < limits.minCents) return `Minimum in this room is ${formatMoney(limits.minCents)}.`;
  if (limits.maxCents !== null && stakeCents > limits.maxCents) return `Max in this room is ${formatMoney(limits.maxCents)}.`;
  return null;
}

const SIDE = {
  yes: { label: "YES", ink: "text-yes-ink", tint: "bg-yes-tint", ring: "outline-yes", border: "border-yes" },
  no: { label: "NO", ink: "text-no-ink", tint: "bg-no-tint", ring: "outline-no", border: "border-no" },
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
      className={`relative overflow-hidden rounded-card bg-surface outline -outline-offset-1 ${confirmed ? `room-confirmed outline-[1.5px] ${SIDE[side].ring}` : "outline-1 outline-line"}`}
    >
      <MatchBanner match={match} size="sm" />
      <div className="p-4">
        <p className="text-caption text-secondary">The call</p>
        <p className="mt-1 text-title-2 font-display text-foreground md:text-title-1">{claim}</p>

        <div className="mt-4 grid grid-cols-2 gap-2" role={onSide ? "radiogroup" : undefined} aria-label={onSide ? "Your side" : undefined}>
          {(["yes", "no"] as const).map((s) => {
            const active = side === s;
            return (
              <SidePill
                key={s}
                side={s}
                selected={active}
                role={onSide ? "radio" : undefined}
                aria-checked={onSide ? active : undefined}
                tabIndex={onSide ? undefined : -1}
                className={onSide ? "" : "pointer-events-none"}
                onClick={onSide ? () => onSide(s) : undefined}
                meta={
                  active ? (
                    <span className="enter-pop flex items-center gap-1 text-caption font-semibold">
                      <CheckIcon className="h-3 w-3" />
                      {confirmed ? "Your side" : "You"}
                    </span>
                  ) : undefined
                }
              />
            );
          })}
        </div>

        <p className="mt-4 text-caption leading-relaxed text-secondary">{meta.join(" · ")}</p>
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
  const accent = SIDE[side];
  const showError = Boolean(error && valueDollars);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="stake" className="text-body font-semibold text-foreground">
          Your stake
        </label>
        <span className="text-caption text-secondary">{limitsLabel(limits)}</span>
      </div>
      <div className={`mt-2 flex min-h-16 items-center gap-2 rounded-control border bg-surface px-4 transition-colors duration-150 ${showError ? "border-no" : accent.border}`}>
        <span className={`text-title-2 font-display ${accent.ink}`}>$</span>
        <input
          id="stake"
          value={valueDollars ? Number(valueDollars).toLocaleString("en-US") : ""}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 7))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          aria-invalid={showError}
          aria-describedby="stake-error"
          className="min-w-0 flex-1 bg-transparent font-display font-bold tabular-nums text-foreground placeholder:text-tertiary focus:outline-none"
          // Inline, not text-3xl: globals.css pins inputs to 16px on mobile
          // (stops iOS focus-zoom), which would otherwise win over the class.
          style={{ fontSize: 30 }}
        />
        <span className="rounded-tag px-1.5 py-0.5 text-micro font-semibold text-secondary edge-strong">USDC</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {quick.map((n) => {
          const active = Number(valueDollars) === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={`h-10 min-w-14 rounded-control px-3 text-label font-semibold tabular-nums outline -outline-offset-1 transition-[transform,background-color,outline-color,color] duration-100 ease-out active:scale-[0.96] ${
                active ? `${accent.tint} ${accent.ink} outline-1 ${accent.ring}` : "bg-surface text-foreground outline-1 outline-line"
              }`}
            >
              {formatMoney(n * 100)}
            </button>
          );
        })}
      </div>
      <p id="stake-error" role="alert" className="mt-2 min-h-4 text-caption">
        {showError ? (
          <span className="text-no-ink">{error}</span>
        ) : (
          <span className="text-secondary">Win and you split the whole pool with everyone on your side.</span>
        )}
      </p>
    </div>
  );
}
