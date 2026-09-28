"use client";
import { track } from "@/lib/analytics/track";

import { useEffect, useRef, useState } from "react";
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
import { haptic } from "@/lib/haptics";
import { SidePill } from "./ui/controls";
import { Button } from "./ui/button";

const SIDE = {
  yes: { label: "YES", color: "var(--yes)", ink: "text-yes-ink", ring: "outline-yes" },
  no: { label: "NO", color: "var(--no)", ink: "text-no-ink", ring: "outline-no" },
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

  // Tapped while the wallet is still arriving (the sign-in kit loads in the
  // background): hold the tap and carry it out the moment the wallet is ready,
  // so nobody has to tap twice. Deferred a tick — submit() sets state.
  const [queued, setQueued] = useState(false);
  const submitRef = useRef<() => void>(() => {});
  useEffect(() => {
    submitRef.current = submit;
  });
  useEffect(() => {
    if (!queued || blocker?.busy) return;
    const t = window.setTimeout(() => {
      setQueued(false);
      submitRef.current();
    }, 0);
    return () => window.clearTimeout(t);
  }, [queued, blocker]);

  if (entered) {
    return (
      <div className={`enter-pop rounded-card bg-surface p-4 outline outline-1 -outline-offset-1 ${SIDE[entered.side].ring}`}>
        <p className="text-body font-semibold text-foreground">
          You&rsquo;re in — backing <span className={SIDE[entered.side].ink}>{SIDE[entered.side].label}</span>
          {entered.cents !== null && <> with {formatMoney(entered.cents)}</>}
        </p>
        <p className="mt-1 text-caption text-secondary">
          Locked in escrow. Win and you split the pool with everyone on your side.
        </p>
        {entered.signature && (
          <a
            href={explorerTxUrl(entered.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover-link mt-2 inline-block text-caption text-secondary underline underline-offset-2"
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
    if (blocker?.busy) {
      setQueued(true);
      return;
    }
    if (blocker) {
      void reconnect(comeBackTo);
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
        haptic("tick");
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
    <div className="flex flex-col gap-4 rounded-card bg-surface p-4 edge">
      <div>
        <p className="text-label font-semibold text-secondary">Take a side</p>
        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Side">
          {(["yes", "no"] as const).map((s) => (
            <SidePill key={s} side={s} selected={side === s} onClick={() => setSide(s)} />
          ))}
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
        <p role="alert" className="text-caption text-no-ink">
          {error}
        </p>
      )}
      {currentUser ? (
        <>
          <StakeButton
            phase={phase}
            onClick={submit}
            disabled={queued || (!blocker && (Boolean(problem) || short))}
            color={accent}
          >
            {blocker?.label ? blocker.label : problem ? "Join" : `Join with ${formatMoney(stakeCents)} on ${SIDE[side].label}`}
          </StakeButton>
          {blocker?.hint && <p className="-mt-2 text-center text-caption text-secondary">{blocker.hint}</p>}
        </>
      ) : (
        <Button variant={side} size="cta" onClick={submit}>
          Sign in to join
        </Button>
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
    return <p className="-mt-1 text-caption text-secondary">Nobody&rsquo;s on the other side yet — if nobody joins it, you get your stake back.</p>;
  }
  return (
    <p className="-mt-1 text-caption text-secondary">
      If {SIDE[side].label} wins right now: <span className="font-semibold tabular-nums text-foreground">{formatMoney(win.payoutCents)}</span>
      {totalBps > 0 && win.feeCents > 0 && <> · after a {pct(totalBps)} fee on winnings ({formatMoney(win.feeCents)})</>}
    </p>
  );
}
