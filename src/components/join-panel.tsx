"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EntrySide } from "@/lib/types";
import { formatMoney } from "@/lib/mock-data";
import { useCurrentUser } from "./current-user-provider";
import { joinRoom } from "@/app/rooms/actions";
import { openAuthModal } from "@/lib/auth-modal-store";
import { refreshRivalyBalance, useRivalyBalance } from "@/lib/wallet/use-rivaly-balance";
import { StakeInput, stakeError } from "./create-room/bet-step";
import { BalanceLine } from "./wallet/top-up";

const SIDE = {
  yes: { label: "YES", color: "var(--rival-blue)", dim: "var(--rival-blue-dim)" },
  no: { label: "NO", color: "var(--rival-red)", dim: "var(--rival-red-dim)" },
} as const;

const SUGGESTED_STAKE_CENTS = 10_00;

// Take a side, pick a stake inside the room's limits, join — the stake comes
// straight off the Rivaly balance, no wallet popup. A "no limit" room means
// the joiner chooses the amount; it never silently enters everyone at the
// minimum. Signed-out visitors are sent to sign in and come straight back
// here with their side still picked.
export function JoinPanel({
  roomId,
  minStakeCents,
  maxStakeCents,
  initialEntry = null,
  initialSide = null,
  returnPath,
}: {
  roomId: string;
  minStakeCents: number;
  maxStakeCents: number | null;
  initialEntry?: EntrySide | null;
  initialSide?: EntrySide | null;
  returnPath: string;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const balance = useRivalyBalance();
  const limits = { minCents: minStakeCents, maxCents: maxStakeCents, error: null };
  const suggested = Math.max(minStakeCents, SUGGESTED_STAKE_CENTS);
  const [side, setSide] = useState<EntrySide>(initialSide ?? "yes");
  const [stakeDollars, setStakeDollars] = useState(
    String(Math.ceil((maxStakeCents === null ? suggested : Math.min(suggested, maxStakeCents)) / 100)),
  );
  const [entered, setEntered] = useState<{ side: EntrySide; cents: number | null } | null>(
    initialEntry ? { side: initialEntry, cents: null } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (entered) {
    return (
      <div className="enter-pop rounded-lg border bg-surface p-4" style={{ borderColor: SIDE[entered.side].color }}>
        <p className="text-sm font-semibold text-foreground">
          You&rsquo;re in — backing <span style={{ color: SIDE[entered.side].color }}>{SIDE[entered.side].label}</span>
          {entered.cents !== null && <> with {formatMoney(entered.cents)}</>}
        </p>
        <p className="mt-1 text-xs text-muted">Win and you split the pool with everyone on your side.</p>
      </div>
    );
  }

  const stakeCents = Number(stakeDollars || 0) * 100;
  const problem = stakeError(stakeCents, limits);
  const short = balance.hasLoaded && balance.cents !== null && balance.cents < stakeCents;
  const accent = SIDE[side].color;

  function submit() {
    if (!currentUser) {
      openAuthModal({ next: `${returnPath}${returnPath.includes("?") ? "&" : "?"}side=${side}` });
      return;
    }
    if (problem || short || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await joinRoom(roomId, side, stakeCents);
      if (res.ok) {
        setEntered({ side, cents: stakeCents });
        void refreshRivalyBalance();
        router.refresh();
      } else {
        setError(res.error);
        if (res.code === "insufficient_balance") void refreshRivalyBalance();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Take a side</p>
        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Side">
          {(["yes", "no"] as const).map((s) => {
            const active = side === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSide(s)}
                className="min-h-12 rounded-md border font-display text-base font-bold tracking-wide transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.97]"
                style={{
                  borderColor: active ? SIDE[s].color : "var(--border)",
                  color: active ? SIDE[s].color : "var(--muted)",
                  background: active ? SIDE[s].dim : "transparent",
                  boxShadow: active ? `inset 0 0 0 1px ${SIDE[s].color}` : "none",
                }}
              >
                {SIDE[s].label}
              </button>
            );
          })}
        </div>
      </div>

      <StakeInput valueDollars={stakeDollars} onChange={setStakeDollars} limits={limits} error={problem} side={side} />
      <BalanceLine needCents={stakeCents} signedIn={Boolean(currentUser)} />

      {error && (
        <p role="alert" className="text-xs text-danger-red">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={Boolean(currentUser) && (Boolean(problem) || short || pending)}
        className="min-h-12 w-full rounded-md text-sm font-semibold text-white transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-40"
        style={{ background: accent }}
      >
        {!currentUser
          ? "Sign in to join"
          : pending
            ? "Joining…"
            : problem
              ? "Join"
              : `Join with ${formatMoney(stakeCents)} on ${SIDE[side].label}`}
      </button>
    </div>
  );
}
