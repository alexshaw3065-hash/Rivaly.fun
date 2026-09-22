"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/mock-data";
import { useCurrentUser } from "./current-user-provider";
import { useRealMatches } from "@/lib/use-real-matches";
import { BottomSheet } from "./bottom-sheet";
import { LiveBadge } from "./live-badge";
import { createRoom, type CreateRoomMarket } from "@/app/rooms/actions";
import type { Match } from "@/lib/types";

const AMOUNTS = [500_00, 1_000_00, 2_000_00, 5_000_00, 10_000_00];
const DEFAULT_GOALS_LINE = 2.5;

type Step = "match" | "market" | "stake";

// Real kickoff_at is genuinely relative to real now (unlike mock-data.ts's
// kickoffCountdownLabel, which anchors to the latest mock live kickoff
// because the seeded dates are stale — that reasoning doesn't apply here).
// Same output shape as that formatter, deliberately, for a consistent feel.
function realCountdown(kickoffAt: string): string | null {
  const diffMs = +new Date(kickoffAt) - Date.now();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.round(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `Kicks off in ${days}d ${hours}h`;
  if (hours > 0) return `Kicks off in ${hours}h ${minutes}m`;
  return `Kicks off in ${minutes}m`;
}

function chipStyle(active: boolean) {
  return {
    borderColor: active ? "var(--rival-blue)" : "var(--border)",
    color: active ? "var(--rival-blue)" : "var(--foreground)",
    background: active ? "var(--rival-blue-dim)" : "transparent",
    transition: "transform 150ms ease-out, background-color 150ms ease, border-color 150ms ease, color 150ms ease",
  };
}

// The whole point of this sheet: every tap both chooses AND advances — no
// separate "Next" button anywhere in the default path. Reuses BottomSheet
// as-is (its existing slide-up drawer already follows the house motion
// rules — see globals.css's .sheet-panel comment — rather than inventing a
// competing "expand from center" animation that would fight them; a sheet
// rising to fill the screen already reads as "the room opening").
//
// Mounted as the actual content of /rooms/create (open is always true here;
// onClose navigates back) rather than a client-side modal toggle, so the
// route stays real, shareable, and back-button-friendly — the FAB and every
// "Challenge" affordance link straight to it, optionally with ?matchId= for
// the fast contextual path.
export function CreateRoomSheet({ initialMatchId }: { initialMatchId?: string }) {
  const currentUser = useCurrentUser();
  const { matches, isLoading } = useRealMatches();
  const creatable = useMemo(() => matches.filter((m) => m.status !== "finished"), [matches]);

  const [matchId, setMatchId] = useState<string | null>(initialMatchId ?? null);
  const [step, setStep] = useState<Step>(initialMatchId ? "market" : "match");
  const [market, setMarket] = useState<CreateRoomMarket | null>(null);
  const [goalsLine, setGoalsLine] = useState(DEFAULT_GOALS_LINE);
  const [customText, setCustomText] = useState("");
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [result, setResult] = useState<{ roomId: string; inviteCode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const match = creatable.find((m) => m.id === matchId) ?? matches.find((m) => m.id === matchId);

  function pickMatch(id: string) {
    setMatchId(id);
    setStep("market");
  }

  function pickWinner(team: "home" | "away") {
    setMarket({ type: "winner", team });
    setStep("stake");
  }

  function pickBothScore() {
    setMarket({ type: "both_score" });
    setStep("stake");
  }

  function confirmGoalsLine(comparison: "over" | "under") {
    setMarket({ type: "total_goals", comparison, line: goalsLine });
    setStep("stake");
  }

  function confirmCustom() {
    if (!customText.trim()) return;
    setMarket({ type: "custom", prediction: customText });
    setStep("stake");
  }

  const ready = Boolean(match && market && amountCents);

  function submit() {
    if (!ready || !match || !market || !amountCents) return;
    setError(null);
    startTransition(async () => {
      const res = await createRoom({
        matchId: match.id,
        entryAmountCents: amountCents,
        visibility,
        market,
      });
      if (res.ok) {
        setResult({ roomId: res.roomId, inviteCode: res.inviteCode });
      } else {
        setError(res.error);
      }
    });
  }

  // Dynamic confirm copy doubles as the review step — no separate summary
  // screen. "Throw down ___" per masterplan 06-emotion-design.md §1: the
  // button shouldn't feel like "Create Room."
  const confirmLabel = amountCents ? `Throw down ${formatMoney(amountCents)} →` : "Throw down →";

  if (result) {
    return (
      <BottomSheet open onClose={() => {}} title="Challenge sent">
        <div className="flex flex-col items-center gap-1 py-2 text-center">
          <p className="font-mono text-[11px] uppercase tracking-wider text-rival-blue">Challenge sent</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            &ldquo;{market?.type === "custom" ? customText : composedLabel(market, match)}&rdquo;
          </p>
          <p className="mt-2 text-sm text-muted">
            Your room is live. Share it — a room without opponents isn&rsquo;t a room.
          </p>

          <div className="mt-6 flex w-full items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-border bg-surface px-4 py-2.5 text-center font-mono text-sm text-foreground">
              {result.inviteCode}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.inviteCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>

          <Link
            href={`/rooms/${result.roomId}`}
            className="mt-4 w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Go to room →
          </Link>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      open
      onClose={() => window.history.back()}
      title="Throw down the challenge"
      headerAction={
        step === "stake" ? (
          <button
            onClick={() => setVisibility(visibility === "public" ? "private" : "public")}
            className="font-mono text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            {visibility}
          </button>
        ) : undefined
      }
    >
      {!currentUser && (
        <div className="mb-5 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          <Link href="/login?next=/rooms/create" className="hover-link text-foreground transition-colors">
            Sign in
          </Link>{" "}
          to create a room.
        </div>
      )}

      {step === "match" && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Which match?</p>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted">Loading matches…</p>
          ) : (
            <div className="mt-3 flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
              {creatable.map((m) => (
                <button
                  key={m.id}
                  onClick={() => pickMatch(m.id)}
                  className="flex items-center justify-between rounded-md border border-border px-3.5 py-3 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
                >
                  <span>
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">
                      {m.competition}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium text-foreground">
                      {m.homeTeam} v {m.awayTeam}
                    </span>
                  </span>
                  {m.status === "live" ? (
                    <LiveBadge />
                  ) : (
                    <span className="font-mono text-[11px] text-muted">{realCountdown(m.kickoffAt)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "market" && match && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {match.homeTeam} v {match.awayTeam}
            </p>
            {match.status === "live" ? (
              <div className="mt-1">
                <LiveBadge />
              </div>
            ) : (
              <p className="mt-1 font-mono text-xs text-muted">{realCountdown(match.kickoffAt)}</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">What do you believe?</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                onClick={() => pickWinner("home")}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                {match.homeTeam} wins
              </button>
              <button
                onClick={() => pickWinner("away")}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                {match.awayTeam} wins
              </button>
              <button
                onClick={pickBothScore}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                Both teams score
              </button>
              <button
                onClick={() => setMarket({ type: "custom", prediction: "" })}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                Write your own
              </button>
            </div>
          </div>

          {/* Total goals — its own row since it needs a line, not just a tap. */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Total goals</p>
              <div className="flex items-center gap-2 font-mono text-sm text-foreground">
                <button
                  onClick={() => setGoalsLine((l) => Math.max(0.5, l - 0.5))}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-border-strong active:scale-90"
                  aria-label="Lower line"
                >
                  −
                </button>
                {goalsLine}
                <button
                  onClick={() => setGoalsLine((l) => l + 0.5)}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-border-strong active:scale-90"
                  aria-label="Raise line"
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                onClick={() => confirmGoalsLine("over")}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                Over {goalsLine}
              </button>
              <button
                onClick={() => confirmGoalsLine("under")}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                Under {goalsLine}
              </button>
            </div>
          </div>

          {market?.type === "custom" && (
            <div className="enter-row">
              <input
                autoFocus
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={`${match.homeTeam} scores 3+ tonight`}
                className="w-full border-b border-border bg-transparent pb-2.5 font-display text-xl font-semibold text-foreground placeholder:text-muted/50 focus:border-foreground focus:outline-none"
                style={{ transition: "border-color 150ms ease" }}
              />
              <p className="mt-2 text-xs text-muted">
                You&rsquo;ll confirm this result yourself once the match ends.
              </p>
              <button
                onClick={confirmCustom}
                disabled={!customText.trim()}
                className="mt-3 w-full rounded-md border border-border-strong py-2.5 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {step === "stake" && match && market && (
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{match.competition}</p>
            <p className="mt-2 text-lg font-medium text-foreground">{composedLabel(market, match)}</p>
            <p className="mt-3 font-mono text-xs text-muted">
              {market.type === "custom" ? "You confirm the result" : "Resolves via official match result"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Entry amount</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmountCents(a)}
                  className="rounded-md border px-3.5 py-2 font-mono text-sm transition-transform duration-150 ease-out active:scale-[0.97]"
                  style={chipStyle(amountCents === a)}
                >
                  {formatMoney(a)}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger-red">{error}</p>}

          <button
            onClick={submit}
            disabled={!ready || !currentUser || pending}
            className="rounded-md bg-foreground py-3.5 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
          >
            {pending ? "Creating…" : confirmLabel}
          </button>
        </div>
      )}
    </BottomSheet>
  );
}

function composedLabel(market: CreateRoomMarket | null, match: Match | undefined): string {
  if (!market || !match) return "";
  switch (market.type) {
    case "winner":
      return `${market.team === "home" ? match.homeTeam : match.awayTeam} wins`;
    case "total_goals":
      return `Total goals ${market.comparison} ${market.line}`;
    case "both_score":
      return "Both teams to score";
    case "custom":
      return market.prediction;
  }
}
