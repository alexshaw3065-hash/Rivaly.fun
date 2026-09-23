"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/mock-data";
import { useCurrentUser } from "./current-user-provider";
import { useRealMatches } from "@/lib/use-real-matches";
import { LiveBadge } from "./live-badge";
import { ChevronIcon } from "./icons";
import { createRoom, type CreateRoomMarket } from "@/app/rooms/actions";
import type { Match } from "@/lib/types";

const AMOUNTS = [500_00, 1_000_00, 2_000_00, 5_000_00, 10_000_00];
const DEFAULT_GOALS_LINE = 2.5;
const DEFAULT_HANDICAP_LINE = 1.5;
const CORRECT_SCORE_MAX = 3; // 0-0 through 3-3 — covers the large majority of real scorelines without the grid turning into a wall of taps.

// Matches further out than this aren't real decisions yet — showing them
// just crowds the list. A week matches how people actually think about a
// footballing week (this weekend's round, this week's midweek fixtures) and
// keeps the list to a size that's actually scannable on a phone rather than
// a multi-day scroll.
const MATCH_WINDOW_DAYS = 7;

type Step = "match" | "market" | "stake";
type MarketChoice = "winner" | "total_goals" | "both_score" | "correct_score" | "handicap" | null;

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

function composedLabel(market: CreateRoomMarket | null, match: Match | undefined): string {
  if (!market || !match) return "";
  switch (market.type) {
    case "winner":
      if (market.outcome === "draw") return "Draw";
      return `${market.outcome === "home" ? match.homeTeam : match.awayTeam} wins`;
    case "total_goals":
      return `Total goals ${market.comparison} ${market.line}`;
    case "both_score":
      return "Both teams to score";
    case "correct_score":
      return `${match.homeTeam} ${market.homeGoals}-${market.awayGoals} ${match.awayTeam}`;
    case "handicap":
      return `${market.team === "home" ? match.homeTeam : match.awayTeam} wins by ${Math.ceil(market.line)}+`;
    case "custom":
      return market.prediction;
  }
}

// A real page, not a modal — a bottom-sheet treatment for this flow broke on
// real mobile devices (fixed-position overlay clipped against the browser
// chrome, only ever showing the bottom half of the content — confirmed from
// a real deployed screenshot, not a guess). A normal page has none of that
// risk, and every entry point already links to a real /rooms/create URL, so
// nothing about routing changes.
//
// Every tap still both chooses and advances in the default path — that part
// of the original design held up. What changed is layout (full page) and
// navigation (an explicit in-flow Back plus a Cancel that leaves the whole
// flow, both requested after the first version shipped with neither).
export function CreateRoomFlow({ initialMatchId }: { initialMatchId?: string }) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { matches, isLoading } = useRealMatches();

  const [matchId, setMatchId] = useState<string | null>(initialMatchId ?? null);
  const [step, setStep] = useState<Step>(initialMatchId ? "market" : "match");
  const [marketChoice, setMarketChoice] = useState<MarketChoice>(null);
  const [market, setMarket] = useState<CreateRoomMarket | null>(null);
  const [goalsLine, setGoalsLine] = useState(DEFAULT_GOALS_LINE);
  const [handicapLine, setHandicapLine] = useState(DEFAULT_HANDICAP_LINE);
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [result, setResult] = useState<{ roomId: string; inviteCode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [league, setLeague] = useState("all");

  // Lazy useState init, not a plain Date.now() call in the render body:
  // React treats a component's render as needing to be idempotent, and
  // Date.now() called directly during render breaks that (two renders with
  // identical props/state could disagree). A lazy initializer runs exactly
  // once, which is the approved way to capture a one-off non-deterministic
  // value — "when this page was opened" doesn't need to keep ticking.
  const [openedAt] = useState(() => Date.now());
  const horizon = openedAt + MATCH_WINDOW_DAYS * 86_400_000;
  const withinWindow = matches.filter((m) => m.status !== "finished" && +new Date(m.kickoffAt) <= horizon);
  const leagues = [...new Set(withinWindow.map((m) => m.competition))].sort();
  const searchQuery = search.trim().toLowerCase();
  const creatable = withinWindow.filter((m) => {
    if (league !== "all" && m.competition !== league) return false;
    if (!searchQuery) return true;
    return (
      m.homeTeam.toLowerCase().includes(searchQuery) ||
      m.awayTeam.toLowerCase().includes(searchQuery) ||
      m.competition.toLowerCase().includes(searchQuery)
    );
  });

  const match = matches.find((m) => m.id === matchId);

  // Contextual entry (a real match already picked before the flow even
  // opened) never shows a Match step — there's nothing to jump back to that
  // exists in this session, so the stepper only ever shows steps that are
  // real for the current visit rather than a step that would just error.
  const visibleSteps: { id: Step; label: string }[] = initialMatchId
    ? [
        { id: "market", label: "Market" },
        { id: "stake", label: "Stake" },
      ]
    : [
        { id: "match", label: "Match" },
        { id: "market", label: "Market" },
        { id: "stake", label: "Stake" },
      ];
  const currentIndex = visibleSteps.findIndex((s) => s.id === step);

  function cancel() {
    router.back();
  }

  // Jumping to an already-reached step, not just one step back — tapping
  // Match after already picking a market clears the market choice, since
  // it was chosen against the team names of whatever match was previously
  // selected and wouldn't necessarily still make sense for a different one.
  function goToStep(target: Step) {
    if (target === "match") {
      setMarketChoice(null);
      setMarket(null);
    }
    setStep(target);
  }

  function pickMatch(id: string) {
    setMatchId(id);
    setMarketChoice(null);
    setStep("market");
  }

  function pickWinner(outcome: "home" | "draw" | "away") {
    setMarket({ type: "winner", outcome });
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

  function pickCorrectScore(homeGoals: number, awayGoals: number) {
    setMarket({ type: "correct_score", homeGoals, awayGoals });
    setStep("stake");
  }

  function confirmHandicap(team: "home" | "away") {
    setMarket({ type: "handicap", team, line: handicapLine });
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
      <main className="mx-auto max-w-xl px-4 py-16 text-center md:px-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-rival-blue">Challenge sent</p>
        <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
          &ldquo;{composedLabel(market, match)}&rdquo;
        </h1>
        <p className="mt-3 text-sm text-muted">
          Your room is live. Share it — a room without opponents isn&rsquo;t a room.
        </p>

        <div className="mt-8 flex items-center justify-center gap-2">
          <code className="rounded-md border border-border bg-surface px-4 py-2.5 font-mono text-sm text-foreground">
            {result.inviteCode}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.inviteCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>

        <Link
          href={`/rooms/${result.roomId}`}
          className="mt-8 inline-block rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Go to room →
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <div className="flex items-center justify-between gap-4">
        {/* Clickable progress stepper — tapping any already-reached step
            jumps straight there (not just one step back), replacing a plain
            "← Back" link. Only reached steps (index <= current) are
            interactive; future steps are visibly inert, so it can't be used
            to skip ahead. Colour transitions on the circles and connectors
            are the only motion here — deliberately no pulse/bounce, per the
            same restraint every other tap feedback in this flow already
            follows. */}
        <ol className="flex items-center">
          {visibleSteps.map((s, i) => {
            const reached = i <= currentIndex;
            const isLast = i === visibleSteps.length - 1;
            return (
              <li key={s.id} className="flex items-center">
                <button
                  onClick={() => reached && goToStep(s.id)}
                  disabled={!reached}
                  aria-current={s.id === step ? "step" : undefined}
                  aria-label={s.label}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-medium duration-150 ease-out ${reached ? "cursor-pointer active:scale-90" : "cursor-default"}`}
                  style={{
                    background: reached ? "var(--rival-blue)" : "transparent",
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: reached ? "var(--rival-blue)" : "var(--border)",
                    color: reached ? "#fff" : "var(--muted)",
                    transition: "background-color 200ms ease, border-color 200ms ease, transform 150ms ease-out",
                  }}
                >
                  {i + 1}
                </button>
                {!isLast && (
                  <span
                    aria-hidden
                    className="h-px w-6"
                    style={{
                      background: reached ? "var(--rival-blue)" : "var(--border)",
                      transition: "background-color 200ms ease",
                    }}
                  />
                )}
              </li>
            );
          })}
        </ol>
        <button onClick={cancel} className="hover-link-danger shrink-0 text-sm text-muted transition-colors">
          Cancel
        </button>
      </div>

      <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-muted">New room</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
        What do you believe?
      </h1>

      {!currentUser && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          <Link href="/login?next=/rooms/create" className="hover-link text-foreground transition-colors">
            Sign in
          </Link>{" "}
          to create a room.
        </div>
      )}

      {step === "match" && (
        <div className="mt-8">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams or league…"
              className="flex-1 rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
              style={{ transition: "border-color 150ms ease" }}
            />
            <select
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-border-strong focus:outline-none"
            >
              <option value="all">All leagues</option>
              {leagues.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">
            Next {MATCH_WINDOW_DAYS} days
          </p>

          {isLoading ? (
            <p className="mt-3 text-sm text-muted">Loading matches…</p>
          ) : creatable.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No matches match that search.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
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
                    <span className="shrink-0 font-mono text-[11px] text-muted">{realCountdown(m.kickoffAt)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "market" && match && (
        <div className="mt-8 flex flex-col gap-5">
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

          {marketChoice === null && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMarketChoice("winner")}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                Match winner
              </button>
              <button
                onClick={() => setMarketChoice("total_goals")}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                Total goals
              </button>
              <button
                onClick={pickBothScore}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                Both teams score
              </button>
              <button
                onClick={() => setMarketChoice("correct_score")}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                Correct score
              </button>
              <button
                onClick={() => setMarketChoice("handicap")}
                className="col-span-2 rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                Handicap
              </button>
            </div>
          )}

          {marketChoice !== null && (
            <button
              onClick={() => setMarketChoice(null)}
              className="hover-link -mt-2 flex w-fit items-center gap-1 text-xs text-muted transition-colors"
            >
              <span className="[&>svg]:h-3 [&>svg]:w-3">
                <ChevronIcon />
              </span>
              Change market type
            </button>
          )}

          {marketChoice === "winner" && (
            <div className="enter-row grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                onClick={() => pickWinner("home")}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                {match.homeTeam} wins
              </button>
              <button
                onClick={() => pickWinner("draw")}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                Draw
              </button>
              <button
                onClick={() => pickWinner("away")}
                className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                style={chipStyle(false)}
              >
                {match.awayTeam} wins
              </button>
            </div>
          )}

          {marketChoice === "total_goals" && (
            <div className="enter-row">
              <div className="flex items-center justify-center gap-3 font-mono text-lg text-foreground">
                <button
                  onClick={() => setGoalsLine((l) => Math.max(0.5, l - 0.5))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong active:scale-90"
                  aria-label="Lower line"
                >
                  −
                </button>
                {goalsLine}
                <button
                  onClick={() => setGoalsLine((l) => l + 0.5)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong active:scale-90"
                  aria-label="Raise line"
                >
                  +
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
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
          )}

          {marketChoice === "correct_score" && (
            <div className="enter-row">
              <p className="text-center text-xs text-muted">
                Rows: {match.homeTeam} · Columns: {match.awayTeam}
              </p>
              <div
                className="mt-2.5 grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${CORRECT_SCORE_MAX + 1}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: CORRECT_SCORE_MAX + 1 }).map((_, home) =>
                  Array.from({ length: CORRECT_SCORE_MAX + 1 }).map((_, away) => (
                    <button
                      key={`${home}-${away}`}
                      onClick={() => pickCorrectScore(home, away)}
                      className="rounded-md border border-border py-2.5 font-mono text-sm text-foreground transition-transform duration-150 ease-out active:scale-90 hover:border-border-strong"
                    >
                      {home}-{away}
                    </button>
                  )),
                )}
              </div>
            </div>
          )}

          {marketChoice === "handicap" && (
            <div className="enter-row">
              <div className="flex items-center justify-center gap-3 font-mono text-lg text-foreground">
                <button
                  onClick={() => setHandicapLine((l) => Math.max(0.5, l - 0.5))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong active:scale-90"
                  aria-label="Lower line"
                >
                  −
                </button>
                {handicapLine}
                <button
                  onClick={() => setHandicapLine((l) => l + 0.5)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong active:scale-90"
                  aria-label="Raise line"
                >
                  +
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => confirmHandicap("home")}
                  className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                  style={chipStyle(false)}
                >
                  {match.homeTeam} wins by {Math.ceil(handicapLine)}+
                </button>
                <button
                  onClick={() => confirmHandicap("away")}
                  className="rounded-md border px-3.5 py-3 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
                  style={chipStyle(false)}
                >
                  {match.awayTeam} wins by {Math.ceil(handicapLine)}+
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === "stake" && match && market && (
        <div className="mt-8 flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{match.competition}</p>
                <p className="mt-2 text-lg font-medium text-foreground">{composedLabel(market, match)}</p>
              </div>
              <button
                onClick={() => setVisibility(visibility === "public" ? "private" : "public")}
                className="shrink-0 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:text-foreground"
              >
                {visibility}
              </button>
            </div>
            <p className="mt-3 font-mono text-xs text-muted">Resolves via official match result</p>
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
    </main>
  );
}
