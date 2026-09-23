"use client";

import { formatMoney } from "@/lib/mock-data";
import type { EntrySide, Match } from "@/lib/types";
import { LiveBadge } from "../live-badge";
import { limitsLabel, type StakeLimits } from "./room-settings";

const QUICK_STAKES_NAIRA = [500, 1_000, 2_000, 5_000, 10_000];

export function kickoffLabel(kickoffAt: string): string {
  const diffMs = +new Date(kickoffAt) - Date.now();
  if (diffMs <= 0) return "Kicking off";
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Kicks off in ${days}d ${hours}h`;
  if (hours > 0) return `Kicks off in ${hours}h ${minutes}m`;
  return `Kicks off in ${minutes}m`;
}

export function stakeError(stakeCents: number, limits: StakeLimits): string | null {
  if (!stakeCents) return "Enter your stake.";
  if (stakeCents < limits.minCents) return `Minimum in this room is ${formatMoney(limits.minCents)}.`;
  if (limits.maxCents !== null && stakeCents > limits.maxCents) return `Max in this room is ${formatMoney(limits.maxCents)}.`;
  return null;
}

/**
 * The room as other people will meet it — competition, the claim, and the
 * two sides. Interactive during the bet step (tap a side), then the same card
 * settles into its confirmed state once the server has actually created the
 * room, so "what I built" and "what exists" are visibly one object.
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
  const sideColor = side === "yes" ? "var(--rival-blue)" : "var(--rival-green)";
  return (
    <div
      className={`rounded-xl border bg-surface p-4 md:p-5 ${confirmed ? "room-confirmed" : ""}`}
      style={{ borderColor: confirmed ? sideColor : "var(--border)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-mono text-[11px] uppercase tracking-wider text-muted">{match.competition}</p>
        {match.status === "live" ? (
          <LiveBadge />
        ) : (
          <span className="shrink-0 font-mono text-[11px] text-muted">{kickoffLabel(match.kickoffAt)}</span>
        )}
      </div>
      <p className="mt-3 text-sm text-muted">
        {match.homeTeam} v {match.awayTeam}
      </p>
      <p className="mt-1 font-display text-2xl font-bold leading-tight text-foreground md:text-3xl">{claim}</p>

      <div className="mt-5 grid grid-cols-2 gap-2" role={onSide ? "radiogroup" : undefined} aria-label={onSide ? "Your side" : undefined}>
        {(["yes", "no"] as const).map((s) => {
          const active = side === s;
          const color = s === "yes" ? "var(--rival-blue)" : "var(--rival-green)";
          const dim = s === "yes" ? "var(--rival-blue-dim)" : "var(--rival-green-dim)";
          const content = (
            <>
              <span className="font-display text-lg font-bold tracking-wide">{s === "yes" ? "YES" : "NO"}</span>
              {active && <span className="text-[11px] font-medium opacity-80">{confirmed ? "Your side" : "You"}</span>}
            </>
          );
          const style = {
            borderColor: active ? color : "var(--border)",
            background: active ? dim : "transparent",
            color: active ? color : "var(--muted)",
          };
          const cls =
            "flex min-h-14 items-center justify-center gap-2 rounded-lg border transition-[transform,background-color,border-color,color] duration-150 ease-out";
          return onSide ? (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSide(s)}
              className={`${cls} active:scale-[0.97]`}
              style={style}
            >
              {content}
            </button>
          ) : (
            <div key={s} className={cls} style={style}>
              {content}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted">{meta.join(" · ")}</p>
    </div>
  );
}

export function StakeInput({
  valueNaira,
  onChange,
  limits,
  error,
}: {
  valueNaira: string;
  onChange: (v: string) => void;
  limits: StakeLimits;
  error: string | null;
}) {
  const inRange = QUICK_STAKES_NAIRA.filter(
    (n) => n * 100 >= limits.minCents && (limits.maxCents === null || n * 100 <= limits.maxCents),
  );
  const quick = inRange.length
    ? inRange
    : [limits.minCents / 100, ...(limits.maxCents !== null ? [limits.maxCents / 100] : [])];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="stake" className="text-sm font-medium text-foreground">
          Your stake
        </label>
        <span className="text-xs text-muted">{limitsLabel(limits)}</span>
      </div>
      <div
        className="mt-2.5 flex min-h-14 items-center gap-2 rounded-lg border bg-surface px-4 transition-colors duration-150 focus-within:border-border-strong"
        style={{ borderColor: error && valueNaira ? "var(--danger-red)" : undefined }}
      >
        <span className="font-mono text-xl text-muted">₦</span>
        <input
          id="stake"
          value={valueNaira ? Number(valueNaira).toLocaleString("en-NG") : ""}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 9))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          aria-invalid={Boolean(error && valueNaira)}
          aria-describedby="stake-error"
          className="min-w-0 flex-1 bg-transparent font-mono text-2xl text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {quick.map((n) => {
          const active = Number(valueNaira) === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className="min-h-10 rounded-md border px-3.5 font-mono text-sm transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.96]"
              style={{
                borderColor: active ? "var(--rival-blue)" : "var(--border)",
                background: active ? "var(--rival-blue-dim)" : "transparent",
                color: active ? "var(--rival-blue)" : "var(--foreground)",
              }}
            >
              {formatMoney(n * 100)}
            </button>
          );
        })}
      </div>
      <p id="stake-error" role="alert" className="mt-2 min-h-4 text-xs text-danger-red">
        {valueNaira ? error : null}
      </p>
    </div>
  );
}
