"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/mock-data";
import { composeMarket } from "@/lib/markets";
import { useCurrentUser } from "./current-user-provider";
import { useRealMatches } from "@/lib/use-real-matches";
import { LiveBadge } from "./live-badge";
import { createRoom } from "@/app/rooms/actions";
import type { EntrySide, Match } from "@/lib/types";
import { MarketPicker, pickLabel, type Pick, type Score } from "./create-room/market-picker";
import { DEFAULT_SETTINGS, limitsLabel, RoomSettingsStep, stakeLimits, type RoomSettings } from "./create-room/room-settings";
import { kickoffLabel, RoomPreviewCard, StakeInput, stakeError } from "./create-room/bet-step";

// Matches further out than this aren't real decisions yet — showing them
// just crowds the list. A week matches how people actually think about a
// footballing week (this weekend's round, this week's midweek fixtures) and
// keeps the list to a size that's actually scannable on a phone rather than
// a multi-day scroll.
const MATCH_WINDOW_DAYS = 7;

// Long enough to see the tapped cell fill (the confirmation that the tap
// landed), short enough that the move to the next step still feels like the
// tap's direct consequence rather than a wait.
const ADVANCE_DELAY_MS = 240;

type Step = "match" | "pick" | "room" | "bet";

const STEPS: { id: Step; label: string; title: string }[] = [
  { id: "match", label: "Match", title: "Pick a match" },
  { id: "pick", label: "Call", title: "What's your call?" },
  { id: "room", label: "Room", title: "Set the room" },
  { id: "bet", label: "Stake", title: "Back your call" },
];

// A real page, not a modal — a bottom-sheet treatment for this flow broke on
// real mobile devices (fixed-position overlay clipped against the browser
// chrome). Four short steps: match → call → room rules → side & stake. Every
// single-tap choice both selects and advances; every step keeps its state
// when you jump back through the progress bar, so nothing is picked twice.
export function CreateRoomFlow({ initialMatchId }: { initialMatchId?: string }) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { matches, isLoading } = useRealMatches();

  const [matchId, setMatchId] = useState<string | null>(initialMatchId ?? null);
  const [step, setStep] = useState<Step>(initialMatchId ? "pick" : "match");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [pick, setPick] = useState<Pick | null>(null);
  const [fullTime, setFullTime] = useState<Score>({ home: 1, away: 0 });
  const [halfTime, setHalfTime] = useState<Score>({ home: 0, away: 0 });
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [side, setSide] = useState<EntrySide>("yes");
  const [stakeNaira, setStakeNaira] = useState("");
  const [result, setResult] = useState<{ roomId: string; inviteCode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const advanceTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  const match = matches.find((m) => m.id === matchId);
  const currentIndex = STEPS.findIndex((s) => s.id === step);
  const limits = stakeLimits(settings);
  const stakeCents = Number(stakeNaira || 0) * 100;
  const stakeProblem = stakeError(stakeCents, limits);
  const claim = pick && match ? composeMarket(pick.market, match).prediction : "";

  function go(target: Step) {
    window.clearTimeout(advanceTimer.current);
    const targetIndex = STEPS.findIndex((s) => s.id === target);
    setDirection(targetIndex >= currentIndex ? "forward" : "back");
    // First arrival at the stake step: pre-fill a sensible stake inside the
    // room's limits so the fastest path is a single confirm tap.
    if (target === "bet" && !stakeNaira) {
      const suggested = Math.max(limits.minCents, 1_000_00);
      setStakeNaira(String((limits.maxCents === null ? suggested : Math.min(suggested, limits.maxCents)) / 100));
    }
    setStep(target);
    window.scrollTo({ top: 0 });
  }

  // A pick only resets when the match actually changes — re-landing on the
  // same match must not throw away a call that's still valid for it.
  function pickMatch(id: string) {
    if (matchId !== id) {
      setPick(null);
      setFullTime({ home: 1, away: 0 });
      setHalfTime({ home: 0, away: 0 });
    }
    setMatchId(id);
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => go("pick"), ADVANCE_DELAY_MS);
  }

  function choose(p: Pick) {
    setPick(p);
    setSide(p.side);
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => go("room"), ADVANCE_DELAY_MS);
  }

  const ready = Boolean(currentUser && match && pick && !limits.error && !stakeProblem);

  function submit() {
    if (!ready || !match || !pick || submitting.current) return;
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const res = await createRoom({
          matchId: match.id,
          market: pick.market,
          side,
          stakeCents,
          minStakeCents: limits.minCents,
          maxStakeCents: limits.maxCents,
          visibility: settings.visibility,
          allowSpectators: settings.allowSpectators,
        });
        if (res.ok) {
          router.prefetch(`/rooms/${res.roomId}`);
          setResult({ roomId: res.roomId, inviteCode: res.inviteCode });
          window.scrollTo({ top: 0 });
        } else {
          setError(res.error);
        }
      } catch {
        setError("Couldn't reach Rivaly — check your connection and try again.");
      } finally {
        submitting.current = false;
      }
    });
  }

  const meta = [
    settings.visibility === "public" ? "Public" : "Private",
    limitsLabel(limits),
    ...(settings.visibility === "public" ? [settings.allowSpectators ? "Spectators on" : "No spectators"] : []),
    pick?.market.type === "anytime_scorer" ? "Creator confirms from the scoresheet" : "Settles on the official result",
  ];

  if (result && match && pick) {
    return (
      <CreatedView
        match={match}
        claim={claim}
        side={side}
        stakeCents={stakeCents}
        meta={meta}
        roomId={result.roomId}
        inviteCode={result.inviteCode}
      />
    );
  }

  const initialMatchMissing = !isLoading && matchId !== null && !match;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-6 pt-5 md:px-6 md:pt-8">
      <div className="flex items-start gap-5">
        <nav aria-label="Create room progress" className="flex-1">
          <ol className="flex gap-1.5">
            {STEPS.map((s, i) => {
              const reached = i <= currentIndex;
              // Forward jumps only to a step whose prerequisites exist.
              const available = reached || (i === 1 && match) || (i === 2 && match && pick) || (i === 3 && match && pick && !limits.error);
              return (
                <li key={s.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => available && go(s.id)}
                    disabled={!available}
                    aria-current={s.id === step ? "step" : undefined}
                    className="w-full pt-2 text-left disabled:cursor-default"
                  >
                    <span
                      className="block h-[3px] rounded-full transition-colors duration-300 ease-out"
                      style={{ background: reached ? "var(--rival-blue)" : "var(--border)" }}
                    />
                    <span
                      className="mt-1.5 block text-[11px] font-medium transition-colors duration-200"
                      style={{ color: s.id === step ? "var(--foreground)" : "var(--muted)" }}
                    >
                      {s.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <button type="button" onClick={() => router.back()} className="hover-link-danger shrink-0 pt-2 text-sm text-muted transition-colors">
          Cancel
        </button>
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold text-foreground md:text-4xl">{STEPS[currentIndex].title}</h1>

      {!currentUser && (
        <p className="mt-3 text-sm text-muted">
          <Link href="/login?next=/rooms/create" className="hover-link text-foreground underline underline-offset-2 transition-colors">
            Sign in
          </Link>{" "}
          to create a room — you can look around first.
        </p>
      )}

      {/* The stake step's preview card already carries the match. */}
      {(step === "pick" || step === "room") && match && (
        <MatchStrip match={match} call={step === "room" && pick ? pickLabel(pick, match) : null} onChange={() => go("match")} />
      )}

      <div key={step} className={`mt-5 ${direction === "forward" ? "step-enter-forward" : "step-enter-back"}`}>
        {step === "match" && (
          <MatchList matches={matches} isLoading={isLoading} selectedId={matchId} onPick={pickMatch} />
        )}

        {step !== "match" && initialMatchMissing && (
          <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
            That match isn&rsquo;t open for new rooms.{" "}
            <button type="button" onClick={() => go("match")} className="hover-link text-foreground underline underline-offset-2">
              Pick another
            </button>
          </div>
        )}

        {step !== "match" && !match && isLoading && <p className="text-sm text-muted">Loading match…</p>}

        {step === "pick" && match && (
          <MarketPicker
            match={match}
            pick={pick}
            onPick={choose}
            fullTime={fullTime}
            setFullTime={setFullTime}
            halfTime={halfTime}
            setHalfTime={setHalfTime}
          />
        )}

        {step === "room" && match && pick && <RoomSettingsStep value={settings} onChange={setSettings} />}

        {step === "bet" && match && pick && (
          <div className="flex flex-col gap-6">
            <RoomPreviewCard match={match} claim={claim} side={side} onSide={setSide} meta={meta} />
            <StakeInput valueNaira={stakeNaira} onChange={setStakeNaira} limits={limits} error={stakeProblem} />
          </div>
        )}
      </div>

      {/* One primary action per screen, pinned above the mobile tab bar so it
          never scrolls away or hides under the keyboard's reach. */}
      {step === "pick" && pick && match && (
        <StickyBar>
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted">Your call </span>
            <span className="font-medium text-foreground">{pickLabel(pick, match)}</span>
          </p>
          <PrimaryButton onClick={() => go("room")}>Continue</PrimaryButton>
        </StickyBar>
      )}
      {step === "room" && (
        <StickyBar>
          <PrimaryButton onClick={() => go("bet")} disabled={Boolean(limits.error)} wide>
            Continue
          </PrimaryButton>
        </StickyBar>
      )}
      {step === "bet" && (
        <StickyBar>
          <div className="flex w-full flex-col gap-2">
            {error && (
              <p role="alert" className="text-sm text-danger-red">
                {error}
              </p>
            )}
            {currentUser ? (
              <PrimaryButton onClick={submit} disabled={!ready || pending} wide>
                {pending
                  ? "Creating your room…"
                  : stakeProblem
                    ? "Throw down →"
                    : `Throw down ${formatMoney(stakeCents)} on ${side === "yes" ? "YES" : "NO"}`}
              </PrimaryButton>
            ) : (
              <Link
                href="/login?next=/rooms/create"
                className="flex min-h-12 w-full items-center justify-center rounded-md bg-foreground text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.98]"
              >
                Sign in to throw down
              </Link>
            )}
          </div>
        </StickyBar>
      )}
    </main>
  );
}

function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-16 z-[5] -mx-4 mt-6 border-t border-border bg-background px-4 py-3 md:bottom-0 md:-mx-6 md:px-6">
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  wide,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 shrink-0 rounded-md bg-foreground px-6 text-sm font-medium text-background transition-[transform,opacity] duration-150 ease-out active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${wide ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}

function MatchStrip({ match, call, onChange }: { match: Match; call: string | null; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="hover-border mt-4 flex w-full items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-2.5 text-left transition-colors duration-150"
    >
      <span className="min-w-0">
        <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-muted">{match.competition}</span>
        <span className="mt-0.5 block text-sm font-medium leading-snug text-foreground">
          {match.homeTeam} v {match.awayTeam}
        </span>
        {call && <span className="mt-1 block text-xs font-medium text-rival-blue">{call}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {match.status === "live" ? <LiveBadge /> : <span className="font-mono text-[11px] text-muted">{kickoffLabel(match.kickoffAt)}</span>}
        <span className="text-[11px] text-muted">Change</span>
      </span>
    </button>
  );
}

function MatchList({
  matches,
  isLoading,
  selectedId,
  onPick,
}: {
  matches: Match[];
  isLoading: boolean;
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [league, setLeague] = useState("all");

  // Lazy useState init, not a plain Date.now() call in the render body:
  // render has to be idempotent, and a lazy initializer runs exactly once —
  // "when this page was opened" doesn't need to keep ticking.
  const [openedAt] = useState(() => Date.now());
  const horizon = openedAt + MATCH_WINDOW_DAYS * 86_400_000;
  const withinWindow = matches.filter((m) => m.status !== "finished" && +new Date(m.kickoffAt) <= horizon);
  const leagues = [...new Set(withinWindow.map((m) => m.competition))].sort();
  const q = search.trim().toLowerCase();
  const creatable = withinWindow.filter((m) => {
    if (league !== "all" && m.competition !== league) return false;
    if (!q) return true;
    return m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q) || m.competition.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams or league…"
          className="min-h-12 flex-1 rounded-md border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
        <select
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          className="min-h-12 rounded-md border border-border bg-surface px-3.5 text-sm text-foreground focus:border-border-strong focus:outline-none"
        >
          <option value="all">All leagues</option>
          {leagues.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">Next {MATCH_WINDOW_DAYS} days</p>

      {isLoading ? (
        <div className="mt-3 flex flex-col gap-2" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[62px] rounded-md border border-border bg-surface" />
          ))}
        </div>
      ) : creatable.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No matches match that search.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {creatable.map((m) => {
            const selected = m.id === selectedId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onPick(m.id)}
                aria-pressed={selected}
                className="hover-border flex min-h-[62px] items-center justify-between gap-3 rounded-md border px-3.5 py-3 text-left transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.98]"
                style={{
                  borderColor: selected ? "var(--rival-blue)" : "var(--border)",
                  background: selected ? "var(--rival-blue-dim)" : "transparent",
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-muted">{m.competition}</span>
                  <span className="mt-0.5 block truncate text-sm font-medium text-foreground">
                    {m.homeTeam} v {m.awayTeam}
                  </span>
                </span>
                {m.status === "live" ? (
                  <LiveBadge />
                ) : (
                  <span className="shrink-0 font-mono text-[11px] text-muted">{kickoffLabel(m.kickoffAt)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreatedView({
  match,
  claim,
  side,
  stakeCents,
  meta,
  roomId,
  inviteCode,
}: {
  match: Match;
  claim: string;
  side: EntrySide;
  stakeCents: number;
  meta: string[];
  roomId: string;
  inviteCode: string;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const copiedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  function flash(kind: "code" | "link") {
    setCopied(kind);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(null), 1500);
  }

  async function share() {
    const url = `${window.location.origin}/rooms/${roomId}`;
    const text = `${claim}. I'm on ${side === "yes" ? "YES" : "NO"} — prove me wrong. Code ${inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Rivaly", text, url });
        return;
      } catch {
        // Dismissed share sheet — nothing to do.
        return;
      }
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    flash("link");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-8 pt-8 md:px-6 md:pt-12">
      <p className="enter-row font-mono text-[11px] uppercase tracking-wider text-rival-blue">You created the room</p>
      <h1 className="enter-row mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">Now find your rival.</h1>

      <div className="mt-6">
        <RoomPreviewCard match={match} claim={claim} side={side} meta={meta} confirmed />
      </div>
      <p className="enter-row mt-3 text-sm text-muted">
        You&rsquo;re in with <span className="font-mono text-foreground">{formatMoney(stakeCents)}</span> on{" "}
        <span style={{ color: side === "yes" ? "var(--rival-blue)" : "var(--rival-green)" }} className="font-medium">
          {side === "yes" ? "YES" : "NO"}
        </span>
        . A room without opponents isn&rsquo;t a room.
      </p>

      <div className="enter-row mt-6 flex items-center gap-2">
        <code className="flex min-h-12 flex-1 items-center rounded-md border border-border bg-surface px-4 font-mono text-sm text-foreground">
          {inviteCode}
        </code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(inviteCode).then(() => flash("code"))}
          className="min-h-12 rounded-md border border-border-strong px-4 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          {copied === "code" ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={share}
          className="min-h-12 rounded-md border border-border-strong px-4 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          {copied === "link" ? "Link copied" : "Share"}
        </button>
      </div>

      <Link
        href={`/rooms/${roomId}`}
        className="mt-4 flex min-h-12 w-full items-center justify-center rounded-md bg-foreground text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.98]"
      >
        Open room →
      </Link>
    </main>
  );
}
