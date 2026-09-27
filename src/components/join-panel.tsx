"use client";
import { track } from "@/lib/analytics/track";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EntrySide } from "@/lib/types";
import { formatMoney } from "@/lib/mock-data";
import { useCurrentUser } from "./current-user-provider";
import { openAuthModal } from "@/lib/auth-modal-store";
import { useStakeable } from "@/lib/wallet/use-stakeable";
import { StakeInput, stakeError } from "./create-room/bet-step";
import { WalletLine } from "./wallet/wallet-line";
import { StakeButton } from "./stake-button";
import { useStake } from "@/lib/escrow/use-stake";
import { explorerTxUrl } from "@/lib/wallet/constants";
import { CallItPrompt } from "./arena/call-it-prompt";
import { estimateWin, pct } from "@/lib/fees";

const SIDE = {
  yes: { label: "YES", color: "var(--rival-blue)", dim: "var(--rival-blue-dim)" },
  no: { label: "NO", color: "var(--rival-red)", dim: "var(--rival-red-dim)" },
} as const;

const SUGGESTED_STAKE_CENTS = 10_00;

// Take a side, pick a stake inside the room's limits, join — backed by the
// devnet USDC in your own embedded wallet. A "no limit" room means the
// joiner chooses the amount; it never silently enters everyone at the
// minimum. Signed-out visitors are sent to sign in and come straight back
// here with their side still picked.
export function JoinPanel({
  roomId,
  minStakeCents,
  maxStakeCents,
  initialEntry = null,
  initialSide = null,
  returnPath,
  canCall = false,
  pool = null,
}: {
  roomId: string;
  minStakeCents: number;
  maxStakeCents: number | null;
  /** The room's money right now and its fee rates, for the "if you win" line. */
  pool?: { yesCents: number; noCents: number; feeBps: number; hostFeeBps: number } | null;
  initialEntry?: EntrySide | null;
  initialSide?: EntrySide | null;
  returnPath: string;
  /** Public room: right after staking, offer to post it to the Arena as a call. */
  canCall?: boolean;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const stakeable = useStakeable();
  const limits = { minCents: minStakeCents, maxCents: maxStakeCents, error: null };
  const suggested = Math.max(minStakeCents, SUGGESTED_STAKE_CENTS);
  const [side, setSide] = useState<EntrySide>(initialSide ?? "yes");
  const [stakeDollars, setStakeDollars] = useState(
    String(Math.ceil((maxStakeCents === null ? suggested : Math.min(suggested, maxStakeCents)) / 100)),
  );
  const [entered, setEntered] = useState<{ side: EntrySide; cents: number | null; signature: string | null } | null>(
    initialEntry ? { side: initialEntry, cents: null, signature: null } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const { stake, phase, blocker, reconnect } = useStake();
  const pending = phase !== "idle";

  if (entered) {
    return (
      <div className="enter-pop rounded-lg border bg-surface p-4" style={{ borderColor: SIDE[entered.side].color }}>
        <p className="text-sm font-semibold text-foreground">
          You&rsquo;re in — backing <span style={{ color: SIDE[entered.side].color }}>{SIDE[entered.side].label}</span>
          {entered.cents !== null && <> with {formatMoney(entered.cents)}</>}
        </p>
        <p className="mt-1 text-xs text-muted">
          Locked in escrow. Win and you split the pool with everyone on your side.
        </p>
        {entered.signature && (
          <a
            href={explorerTxUrl(entered.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover-link mt-1.5 inline-block text-xs text-muted underline underline-offset-2"
          >
            Verify your stake on Solana ↗
          </a>
        )}
        {canCall && entered.cents !== null && <CallItPrompt roomId={roomId} side={entered.side} />}
      </div>
    );
  }

  const stakeCents = Number(stakeDollars || 0) * 100;
  const problem = stakeError(stakeCents, limits);
  const short = stakeable.hasLoaded && stakeable.availableCents !== null && stakeable.availableCents < stakeCents;
  const accent = SIDE[side].color;

  const comeBackTo = `${returnPath}${returnPath.includes("?") ? "&" : "?"}side=${side}`;

  function submit() {
    if (!currentUser) {
      openAuthModal({ next: comeBackTo });
      return;
    }
    if (blocker) {
      if (!blocker.busy) void reconnect(comeBackTo);
      return;
    }
    if (problem || short || pending) return;
    setError(null);
    void (async () => {
      // Gasless on-chain stake into escrow; the entry exists only once the
      // transfer is verified.
      const res = await stake({ kind: "join", roomId, side, amountCents: stakeCents });
      track(res.ok ? "stake_submitted" : "stake_failed", res.ok ? { amount: stakeCents, side } : { kind: "join", code: res.code ?? "error" });
      if (res.ok) {
        navigator.vibrate?.(12);
        window.setTimeout(() => {
          setEntered({ side, cents: stakeCents, signature: res.signature });
          stakeable.refresh();
          router.refresh();
        }, 450);
      } else {
        setError(res.error);
        if (res.code === "insufficient_balance") stakeable.refresh();
      }
    })();
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
      {pool && !problem && <WinLine side={side} stakeCents={stakeCents} pool={pool} />}
      <WalletLine
        needCents={stakeCents}
        signedIn={Boolean(currentUser)}
        availableCents={stakeable.availableCents}
        hasLoaded={stakeable.hasLoaded}
      />

      {error && (
        <p role="alert" className="text-xs text-danger-red">
          {error}
        </p>
      )}
      {currentUser ? (
        <>
          <StakeButton
            phase={phase}
            onClick={submit}
            disabled={blocker?.busy || (!blocker && (Boolean(problem) || short))}
            color={accent}
          >
            {blocker?.label ? blocker.label : problem ? "Join" : `Join with ${formatMoney(stakeCents)} on ${SIDE[side].label}`}
          </StakeButton>
          {blocker?.hint && <p className="-mt-2 text-center text-xs text-muted">{blocker.hint}</p>}
        </>
      ) : (
        <button
          type="button"
          onClick={submit}
          className="min-h-12 w-full rounded-md text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.98]"
          style={{ background: accent }}
        >
          Sign in to join
        </button>
      )}
    </div>
  );
}

// What this stake pays if its side wins, from the room as it stands — with
// the fee spelled out, never folded in quietly. It moves as others join.
function WinLine({
  side,
  stakeCents,
  pool,
}: {
  side: EntrySide;
  stakeCents: number;
  pool: { yesCents: number; noCents: number; feeBps: number; hostFeeBps: number };
}) {
  const win = estimateWin({ stakeCents, side, ...pool });
  const totalBps = pool.feeBps + pool.hostFeeBps;
  if (!win) {
    return <p className="-mt-1 text-xs text-muted">Nobody&rsquo;s on the other side yet — if nobody joins it, you get your stake back.</p>;
  }
  return (
    <p className="-mt-1 text-xs text-muted">
      If {SIDE[side].label} wins right now: <span className="font-semibold text-foreground">{formatMoney(win.payoutCents)}</span>
      {totalBps > 0 && win.feeCents > 0 && <> · after a {pct(totalBps)} fee on winnings ({formatMoney(win.feeCents)})</>}
    </p>
  );
}
