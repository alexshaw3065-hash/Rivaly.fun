"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/mock-data";
import { composeMarket, sportOf, type Sport } from "@/lib/markets";
import { useCurrentUser } from "./current-user-provider";
import { useRealMatches } from "@/lib/use-real-matches";
import { LiveBadge } from "./live-badge";
import { TeamCrest } from "./team-crest";
import type { EntrySide, Match } from "@/lib/types";
import { MarketPicker, pickLabel, type Pick, type Score } from "./create-room/market-picker";
import { DEFAULT_SETTINGS, limitsLabel, RoomSettingsStep, stakeLimits, type RoomSettings } from "./create-room/room-settings";
import { RoomPreviewCard, StakeInput, stakeError } from "./create-room/bet-step";
import { kickoffLabel, MatchBanner } from "./create-room/match-hero";
import { GridironIcon, SoccerIcon } from "./create-room/market-icons";
import { WalletLine } from "./wallet/wallet-line";
import { openAuthModal } from "@/lib/auth-modal-store";
import { useStakeable } from "@/lib/wallet/use-stakeable";
import { useStake } from "@/lib/escrow/use-stake";
import { StakeButton } from "./stake-button";
import { explorerTxUrl } from "@/lib/wallet/constants";

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

// First stake suggested on arrival at the stake step, clamped into the
// room's limits — the fastest path is a single confirm tap.
const SUGGESTED_STAKE_CENTS = 10_00;

type Step = "match" | "pick" | "room" | "bet";

// Signing in happens only at "Throw down" — and a brand-new account detours
// through /auth/complete-profile, which unmounts this page. The draft rides
// through that in sessionStorage (this tab only, gone when it closes), and
// `?resume=1` on the way back restores it straight onto the stake step.
const DRAFT_KEY = "rivaly:create-draft";

interface Draft {
  matchId: string;
  pick: Pick;
  fullTime: Score;
  halfTime: Score;
  settings: RoomSettings;
  side: EntrySide;
  stakeDollars: string;
}

function saveDraft(d: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // Storage blocked (private mode) — sign-in still works, the picks just
    // won't survive it.
  }
}

function takeDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

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
export function CreateRoomFlow({ initialMatchId, resume = false, vs }: { initialMatchId?: string; resume?: boolean; vs?: string }) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const stakeable = useStakeable();
  const { matches, isLoading } = useRealMatches();

  const [matchId, setMatchId] = useState<string | null>(initialMatchId ?? null);
  const [step, setStep] = useState<Step>(initialMatchId ? "pick" : "match");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [pick, setPick] = useState<Pick | null>(null);
  const [fullTime, setFullTime] = useState<Score>({ home: 1, away: 0 });
  const [halfTime, setHalfTime] = useState<Score>({ home: 0, away: 0 });
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [side, setSide] = useState<EntrySide>("yes");
  const [stakeDollars, setStakeDollars] = useState("");
  const [result, setResult] = useState<{ roomId: string; inviteCode: string; signature: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { stake, phase, walletReady, blocker, reconnect } = useStake();
  const pending = phase !== "idle";
  const advanceTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  // Back from sign-in: put every pick back and land on the stake step. Done
  // after mount (not in a state initializer) because sessionStorage doesn't
  // exist during the server render, and reading it there would mismatch.
  const autoSubmit = useRef(false);
  useEffect(() => {
    if (!resume) return;
    const d = takeDraft();
    if (!d) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from storage after sign-in */
    setMatchId(d.matchId);
    setPick(d.pick);
    setFullTime(d.fullTime);
    setHalfTime(d.halfTime);
    setSettings(d.settings);
    setSide(d.side);
    setStakeDollars(d.stakeDollars);
    setStep("bet");
    /* eslint-enable react-hooks/set-state-in-effect */
    autoSubmit.current = true;
  }, [resume]);

  const match = matches.find((m) => m.id === matchId);
  const currentIndex = STEPS.findIndex((s) => s.id === step);
  const limits = stakeLimits(settings);
  const stakeCents = Number(stakeDollars || 0) * 100;
  const stakeProblem = stakeError(stakeCents, limits);
  const claim = pick && match ? composeMarket(pick.market, match).prediction : "";

  function go(target: Step) {
    window.clearTimeout(advanceTimer.current);
    const targetIndex = STEPS.findIndex((s) => s.id === target);
    setDirection(targetIndex >= currentIndex ? "forward" : "back");
    if (target === "bet" && !stakeDollars) {
      const suggested = Math.max(limits.minCents, SUGGESTED_STAKE_CENTS);
      setStakeDollars(String((limits.maxCents === null ? suggested : Math.min(suggested, limits.maxCents)) / 100));
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

  const short = stakeable.hasLoaded && stakeable.availableCents !== null && stakeable.availableCents < stakeCents;
  const ready = Boolean(currentUser && match && pick && !limits.error && !stakeProblem && !short);

  function submit() {
    if (!currentUser) {
      if (!match || !pick || stakeProblem || limits.error) return;
      saveDraft({ matchId: match.id, pick, fullTime, halfTime, settings, side, stakeDollars });
      openAuthModal({ next: `/rooms/create?resume=1${vs ? `&vs=${vs}` : ""}` });
      return;
    }
    if (blocker) {
      // Signed in, but the wallet can't sign here yet — reconnect it and
      // come straight back to this stake, draft intact.
      if (blocker.busy || !match || !pick) return;
      saveDraft({ matchId: match.id, pick, fullTime, halfTime, settings, side, stakeDollars });
      void reconnect(`/rooms/create?resume=1${vs ? `&vs=${vs}` : ""}`);
      return;
    }
    if (!ready || !match || !pick || pending) return;
    setError(null);
    void (async () => {
      // Gasless on-chain stake: prepare → wallet confirm → lock in escrow.
      // The room only exists once the transfer has been verified.
      const res = await stake({
        kind: "create",
        room: {
          matchId: match.id,
          market: pick.market,
          side,
          stakeCents,
          minStakeCents: limits.minCents,
          maxStakeCents: limits.maxCents,
          visibility: settings.visibility,
          allowSpectators: settings.allowSpectators,
        },
      });
      if (res.ok) {
        clearDraft();
        stakeable.refresh();
        router.prefetch(`/rooms/${res.roomId}`);
        navigator.vibrate?.(12);
        // Let the button sit on "Locked" for a beat — the confirmation that
        // the money actually moved — before the card takes over.
        window.setTimeout(() => {
          setResult({ roomId: res.roomId, inviteCode: res.inviteCode ?? "", signature: res.signature });
          window.scrollTo({ top: 0 });
        }, 450);
      } else {
        setError(res.error);
        if (res.code === "insufficient_balance") stakeable.refresh();
      }
    })();
  }

  // The "room is created the moment they're back" half of sign-in-at-the-end:
  // once the restored draft, the session and the balance are all in, fire
  // the create once. If the balance doesn't cover it, stop and let the
  // stake step's "Add USDC" do its job instead.
  useEffect(() => {
    if (!autoSubmit.current || !currentUser || !match || !pick || !stakeable.hasLoaded || !walletReady) return;
    autoSubmit.current = false;
    // Deferred a tick: submit() sets state, which mustn't happen synchronously
    // inside the effect. The wallet's confirm screen opens right after.
    if (ready) window.setTimeout(submit, 0);
  });

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
        signature={result.signature}
        vs={vs}
      />
    );
  }

  const initialMatchMissing = !isLoading && matchId !== null && !match;
  const sideColor = side === "yes" ? "var(--rival-blue)" : "var(--rival-red)";

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
                    aria-label={`Step ${i + 1}: ${s.label}`}
                    className="w-full pt-2 text-left disabled:cursor-default"
                  >
                    <span className="block h-1 overflow-hidden rounded-full bg-border">
                      <span
                        className="block h-full rounded-full bg-rival-blue transition-transform duration-500 ease-out"
                        style={{ transform: reached ? "translateX(0)" : "translateX(-101%)" }}
                      />
                    </span>
                    <span
                      className="mt-1.5 block text-[11px] font-semibold transition-colors duration-200"
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

      {vs && (
        <p className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold text-rival-blue ring-1 ring-rival-blue/40">
          Challenging @{vs}
        </p>
      )}
      <h1 className="mt-6 font-display text-3xl font-bold text-foreground md:text-4xl">{STEPS[currentIndex].title}</h1>

      {/* The stake step's preview card already carries the match. */}
      {(step === "pick" || step === "room") && match && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <MatchBanner match={match}>
            <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-foreground/10 pt-3">
              {step === "room" && pick ? (
                <span className="min-w-0 truncate text-sm">
                  <span className="text-foreground/70">Your call </span>
                  <span className="font-semibold text-foreground">{pickLabel(pick, match)}</span>
                </span>
              ) : (
                <span className="text-xs text-foreground/70">
                  {sportOf(match) === "nfl" ? "Settles on the official NFL result" : "Settles on the official match result"}
                </span>
              )}
              <button
                type="button"
                onClick={() => go("match")}
                className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-foreground/25 bg-background/60 px-3 text-xs font-semibold text-foreground transition-[transform,background-color] duration-150 ease-out hover:bg-background/80 active:scale-[0.96]"
              >
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden>
                  <path d="M4 7h11m0 0-3-3m3 3-3 3M16 13H5m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Change match
              </button>
            </div>
          </MatchBanner>
        </div>
      )}

      <div key={step} className={`mt-5 ${direction === "forward" ? "step-enter-forward" : "step-enter-back"}`}>
        {step === "match" && <MatchList matches={matches} isLoading={isLoading} selectedId={matchId} onPick={pickMatch} />}

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
            <StakeInput valueDollars={stakeDollars} onChange={setStakeDollars} limits={limits} error={stakeProblem} side={side} />
            <WalletLine
              needCents={stakeCents}
              signedIn={Boolean(currentUser)}
              availableCents={stakeable.availableCents}
              hasLoaded={stakeable.hasLoaded}
            />
          </div>
        )}
      </div>

      {/* One primary action per screen, pinned above the mobile tab bar so it
          never scrolls away. */}
      {step === "pick" && pick && match && (
        <StickyBar>
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted">Your call </span>
            <span className="font-semibold text-rival-blue">{pickLabel(pick, match)}</span>
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
            <StakeButton
              phase={phase}
              onClick={submit}
              disabled={currentUser ? (blocker ? Boolean(blocker.busy) : !ready) : Boolean(stakeProblem || limits.error)}
              color={sideColor}
            >
              {currentUser && blocker?.label
                ? blocker.label
                : stakeProblem
                  ? "Throw down →"
                  : `Throw down ${formatMoney(stakeCents)} on ${side === "yes" ? "YES" : "NO"}`}
            </StakeButton>
            {!currentUser && (
              <p className="text-center text-xs text-muted">One quick sign-in, then your room goes live — your picks are kept.</p>
            )}
            {currentUser && blocker?.hint && <p className="text-center text-xs text-muted">{blocker.hint}</p>}
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
  color = "var(--rival-blue)",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 shrink-0 rounded-md px-6 text-sm font-semibold text-white transition-[transform,opacity,background-color] duration-150 ease-out active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 ${wide ? "w-full" : ""}`}
      style={{ background: color }}
    >
      {children}
    </button>
  );
}

type SportFilter = "all" | Sport;

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
  const [sport, setSport] = useState<SportFilter>("all");

  // Lazy useState init, not a plain Date.now() call in the render body:
  // render has to be idempotent, and a lazy initializer runs exactly once —
  // "when this page was opened" doesn't need to keep ticking.
  const [openedAt] = useState(() => Date.now());
  const horizon = openedAt + MATCH_WINDOW_DAYS * 86_400_000;
  // Stakes close at kickoff, so only matches still to start are offered.
  const withinWindow = matches.filter(
    (m) => m.status === "scheduled" && +new Date(m.kickoffAt) > openedAt && +new Date(m.kickoffAt) <= horizon,
  );
  const hasNfl = withinWindow.some((m) => sportOf(m) === "nfl");
  const bySport = withinWindow.filter((m) => sport === "all" || sportOf(m) === sport);
  const leagues = [...new Set(bySport.map((m) => m.competition))].sort();
  const q = search.trim().toLowerCase();
  const creatable = bySport.filter((m) => {
    if (league !== "all" && m.competition !== league) return false;
    if (!q) return true;
    return m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q) || m.competition.toLowerCase().includes(q);
  });

  return (
    <div>
      {hasNfl && (
        <div role="radiogroup" aria-label="Sport" className="mb-3 flex gap-2">
          {(
            [
              { id: "all", label: "All", icon: null },
              { id: "soccer", label: "Football", icon: <SoccerIcon /> },
              { id: "nfl", label: "NFL", icon: <GridironIcon /> },
            ] as const
          ).map((o) => {
            const active = sport === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setSport(o.id);
                  setLeague("all");
                }}
                className="flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-[background-color,border-color,color] duration-150"
                style={{
                  borderColor: active ? "var(--rival-blue)" : "var(--border)",
                  background: active ? "var(--rival-blue-dim)" : "transparent",
                  color: active ? "var(--rival-blue)" : "var(--muted)",
                }}
              >
                {o.icon}
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams or league…"
          aria-label="Search matches"
          className="min-h-12 flex-1 rounded-md border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted focus:border-rival-blue focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
        <select
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          aria-label="League"
          className="min-h-12 rounded-md border border-border bg-surface px-3.5 text-sm text-foreground focus:border-rival-blue focus:outline-none"
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
            <div key={i} className="h-[72px] rounded-lg border border-border bg-surface" />
          ))}
        </div>
      ) : creatable.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No matches match that search.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {creatable.map((m) => (
            <MatchRow key={m.id} match={m} selected={m.id === selectedId} onPick={() => onPick(m.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchRow({ match: m, selected, onPick }: { match: Match; selected: boolean; onPick: () => void }) {
  const nfl = sportOf(m) === "nfl";
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className="hover-border flex min-h-[72px] items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.98]"
      style={{
        borderColor: selected ? "var(--rival-blue)" : "var(--border)",
        background: selected ? "var(--rival-blue-dim)" : "var(--surface)",
        boxShadow: selected ? "inset 0 0 0 1px var(--rival-blue)" : "none",
      }}
    >
      <span className="flex shrink-0 -space-x-1.5">
        <TeamCrest name={m.homeTeam} size={26} />
        <TeamCrest name={m.awayTeam} size={26} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-muted">
          {nfl ? <GridironIcon className="h-3 w-3" /> : <SoccerIcon className="h-3 w-3" />}
          <span className="truncate font-mono text-[10px] uppercase tracking-wider">{m.competition}</span>
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
          {m.homeTeam} <span className="font-normal text-muted">v</span> {m.awayTeam}
        </span>
      </span>
      {m.status === "live" ? (
        <LiveBadge />
      ) : (
        <span className="shrink-0 text-right font-mono text-[11px] leading-tight text-muted">
          {kickoffLabel(m.kickoffAt).replace("Kicks off in ", "")}
        </span>
      )}
    </button>
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
  signature,
  vs,
}: {
  match: Match;
  claim: string;
  side: EntrySide;
  stakeCents: number;
  meta: string[];
  roomId: string;
  inviteCode: string;
  signature: string;
  /** Made as a challenge to this person — the share is addressed to them. */
  vs?: string;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const copiedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
  const sideColor = side === "yes" ? "var(--rival-blue)" : "var(--rival-red)";

  function flash(kind: "code" | "link") {
    setCopied(kind);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(null), 1500);
  }

  async function share() {
    const url = `${window.location.origin}/rooms/${roomId}`;
    const call = side === "yes" ? "YES" : "NO";
    const text = vs
      ? `@${vs} — ${claim}. I'm on ${call}. You take the other side. Code ${inviteCode}`
      : `${claim}. I'm on ${call} — prove me wrong. Code ${inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Rivaly", text, url });
      } catch {
        // Dismissed share sheet — nothing to do.
      }
      return;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    flash("link");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-8 pt-8 md:px-6 md:pt-12">
      <p className="enter-row font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: sideColor }}>
        You created the room
      </p>
      <h1 className="enter-row mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">{vs ? `Now send it to @${vs}.` : "Now find your rival."}</h1>

      <div className="mt-6">
        <RoomPreviewCard match={match} claim={claim} side={side} meta={meta} confirmed />
      </div>
      <p className="enter-row mt-3 text-sm text-muted">
        You&rsquo;re in with <span className="font-mono font-semibold text-foreground">{formatMoney(stakeCents)}</span> on{" "}
        <span style={{ color: sideColor }} className="font-semibold">
          {side === "yes" ? "YES" : "NO"}
        </span>
        , locked in escrow. A room without opponents isn&rsquo;t a room.
      </p>
      <a
        href={explorerTxUrl(signature)}
        target="_blank"
        rel="noopener noreferrer"
        className="enter-row hover-link mt-1.5 inline-flex items-center gap-1 text-xs text-muted underline underline-offset-2"
      >
        Verify your stake on Solana ↗
      </a>

      <div className="enter-row mt-6 flex items-center gap-2">
        <code className="flex min-h-12 flex-1 items-center rounded-md border border-border bg-surface px-4 font-mono text-sm font-semibold tracking-wider text-foreground">
          {inviteCode}
        </code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(inviteCode).then(() => flash("code"))}
          className="min-h-12 rounded-md border border-border-strong px-4 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          {copied === "code" ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={share}
          className="min-h-12 rounded-md border px-4 text-sm font-semibold transition-transform duration-150 ease-out active:scale-[0.98]"
          style={{ borderColor: sideColor, color: sideColor }}
        >
          {copied === "link" ? "Link copied" : vs ? `Send to @${vs}` : "Challenge a rival"}
        </button>
        <Link
          href={`/rooms/${roomId}`}
          className="flex min-h-12 items-center justify-center rounded-md text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.98]"
          style={{ background: sideColor }}
        >
          Open room →
        </Link>
      </div>
    </main>
  );
}
