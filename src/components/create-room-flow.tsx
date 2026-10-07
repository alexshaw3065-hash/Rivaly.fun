"use client";
import { withRef } from "@/lib/referral";
import { track } from "@/lib/analytics/track";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/mock-data";
import { composeMarket, sportOf, type Sport } from "@/lib/markets";
import { useCurrentUser } from "./current-user-provider";
import { useRealMatches } from "@/lib/use-real-matches";
import { LiveBadge } from "./live-badge";
import { Button, ButtonLink } from "./ui/button";
import { Chip } from "./ui/controls";
import { Skeleton } from "./ui/surfaces";
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
import { useFeeSettings } from "@/lib/fees";
import { HostEarnLine } from "./create-room/host-earn-line";
import { LeagueMark } from "@/components/league-mark";
import { siteUrl } from "@/lib/site";
import { haptic } from "@/lib/haptics";

// How far ahead Create Room lists matches. Three weeks, so an international
// break never leaves the Premier League off the list (a week wasn't enough:
// the next round can be 14 days away). Search and the league filter keep it
// scannable.
const MATCH_WINDOW_DAYS = 21;

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
  const fees = useFeeSettings();
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

  // Tapped while the wallet is still arriving (the sign-in kit loads in the
  // background): hold the tap and carry it out the moment the wallet is ready,
  // so nobody has to tap twice. Deferred a tick — submit() sets state.
  const [queued, setQueued] = useState(false);
  const submitRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!queued || blocker?.busy) return;
    const t = window.setTimeout(() => {
      setQueued(false);
      submitRef.current();
    }, 0);
    return () => window.clearTimeout(t);
  }, [queued, blocker]);
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
    track("room_create_step", { step: target });
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
    if (blocker?.busy) {
      setQueued(true);
      return;
    }
    if (blocker) {
      // Signed in, but the wallet can't sign here yet — reconnect it and
      // come straight back to this stake, draft intact.
      if (!match || !pick) return;
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
        track("room_created", { amount: stakeCents, side, market: pick.market.type, visibility: settings.visibility });
        clearDraft();
        stakeable.refresh();
        router.prefetch(`/rooms/${res.roomId}`);
        haptic("tick");
        // Let the button sit on "Locked" for a beat — the confirmation that
        // the money actually moved — before the card takes over.
        window.setTimeout(() => {
          setResult({ roomId: res.roomId, inviteCode: res.inviteCode ?? "", signature: res.signature });
          window.scrollTo({ top: 0 });
        }, 450);
      } else {
        setError(res.error);
        track("stake_failed", { kind: "create", code: res.code ?? "error" });
        if (res.code === "insufficient_balance") stakeable.refresh();
      }
    })();
  }

  useEffect(() => {
    submitRef.current = submit;
  });

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
    "Settles on the official result",
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
  const sideColor = side === "yes" ? "var(--yes)" : "var(--no)";

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
                    <span className="block h-1 overflow-hidden rounded-full bg-line-strong">
                      <span
                        className="block h-full rounded-full bg-yes transition-transform duration-500 ease-out"
                        style={{ transform: reached ? "translateX(0)" : "translateX(-101%)" }}
                      />
                    </span>
                    <span className={`mt-2 block text-micro font-semibold transition-colors duration-200 ${s.id === step ? "text-foreground" : "text-tertiary"}`}>
                      {s.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
        <button type="button" onClick={() => router.back()} className="hover-link-danger relative shrink-0 pt-2 text-label text-secondary transition-colors before:absolute before:-inset-3">
          Cancel
        </button>
      </div>

      {vs && (
        <p className="mt-5 inline-flex h-8 items-center gap-2 rounded-full bg-yes-tint px-3 text-label font-semibold text-yes-ink">
          Challenging @{vs}
        </p>
      )}
      <h1 className="mt-6 text-title-1 font-display text-foreground md:text-display">{STEPS[currentIndex].title}</h1>

      {/* The stake step's preview card already carries the match. */}
      {(step === "pick" || step === "room") && match && (
        <div className="mt-4 overflow-hidden rounded-card edge">
          <MatchBanner match={match}>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-foreground/10 pt-3">
              {step === "room" && pick ? (
                <span className="min-w-0 truncate text-label">
                  <span className="text-foreground/70">Your call </span>
                  <span className="font-semibold text-foreground">{pickLabel(pick, match)}</span>
                </span>
              ) : (
                <span className="text-caption text-foreground/70">
                  {sportOf(match) === "nfl" ? "Settles on the official NFL result" : "Settles on the official match result"}
                </span>
              )}
              <button
                type="button"
                onClick={() => go("match")}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-background/60 px-3 text-caption font-semibold text-foreground ring-1 ring-foreground/20 transition-[transform,background-color] duration-100 ease-out hover:bg-background/80 active:scale-[0.96]"
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
          <div className="rounded-card bg-surface p-4 text-body text-secondary edge">
            That match isn&rsquo;t open for new rooms.{" "}
            <button type="button" onClick={() => go("match")} className="hover-link text-foreground underline underline-offset-2">
              Pick another
            </button>
          </div>
        )}

        {step !== "match" && !match && isLoading && <Skeleton className="h-40 rounded-card" />}

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
            {fees.live && fees.hostBps > 0 && <HostEarnLine hostBps={fees.hostBps} />}
          </div>
        )}
      </div>

      {/* One primary action per screen, pinned above the mobile tab bar so it
          never scrolls away. */}
      {step === "pick" && pick && match && (
        <StickyBar>
          <p className="min-w-0 flex-1 truncate text-body">
            <span className="text-secondary">Your call </span>
            <span className="font-semibold text-yes-ink">{pickLabel(pick, match)}</span>
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
              <p role="alert" className="text-label text-no-ink">
                {error}
              </p>
            )}
            <StakeButton
              phase={phase}
              onClick={submit}
              disabled={currentUser ? (blocker ? queued : !ready) : Boolean(stakeProblem || limits.error)}
              color={sideColor}
            >
              {currentUser && blocker?.label
                ? blocker.label
                : stakeProblem
                  ? "Throw down →"
                  : `Throw down ${formatMoney(stakeCents)} on ${side === "yes" ? "YES" : "NO"}`}
            </StakeButton>
            {!currentUser && (
              <p className="text-center text-caption text-secondary">One quick sign-in, then your room goes live — your picks are kept.</p>
            )}
            {currentUser && blocker?.hint && <p className="text-center text-caption text-secondary">{blocker.hint}</p>}
          </div>
        </StickyBar>
      )}
    </main>
  );
}

function StickyBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-[5] -mx-4 mt-6 border-t border-line bg-background px-4 py-3 md:bottom-0 md:-mx-6 md:px-6">
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

function PrimaryButton({ onClick, disabled, wide, children }: { onClick: () => void; disabled?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <Button variant="primary" size="lg" full={wide} className="shrink-0 px-6" onClick={onClick} disabled={disabled}>
      {children}
    </Button>
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
              <Chip
                key={o.id}
                role="radio"
                aria-checked={active}
                aria-pressed={undefined}
                selected={active}
                leading={o.icon}
                onClick={() => {
                  setSport(o.id);
                  setLeague("all");
                }}
              >
                {o.label}
              </Chip>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams or league…"
          aria-label="Search matches"
          className="h-12 min-h-12 flex-1 rounded-control border border-line-strong bg-surface px-4 text-body-lg text-foreground transition-colors duration-150 placeholder:text-tertiary focus:border-yes focus:outline-none"
        />
        <select
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          aria-label="League"
          className="h-12 rounded-control border border-line-strong bg-surface px-4 text-body-lg text-foreground focus:border-yes focus:outline-none"
        >
          <option value="all">All leagues</option>
          {leagues.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-6 text-label font-semibold text-secondary">Next {MATCH_WINDOW_DAYS} days</p>

      {isLoading ? (
        <div className="mt-3 flex flex-col gap-2" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[72px] rounded-card" />
          ))}
        </div>
      ) : creatable.length === 0 ? (
        <p className="mt-3 text-body text-secondary">No matches match that search.</p>
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
      className={`flex min-h-[72px] items-center gap-3 rounded-card px-4 py-3 text-left outline -outline-offset-1 transition-[transform,background-color,outline-color] duration-100 ease-out active:scale-[0.98] ${
        selected ? "bg-yes-tint outline-[1.5px] outline-yes" : "bg-surface outline-1 outline-line hover:bg-surface-elevated"
      }`}
    >
      <span className="flex shrink-0 -space-x-1.5">
        <TeamCrest name={m.homeTeam} size={26} />
        <TeamCrest name={m.awayTeam} size={26} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-secondary">
          <LeagueMark name={m.competition} size={12} fallback={nfl ? <GridironIcon className="h-3 w-3" /> : <SoccerIcon className="h-3 w-3" />} />
          <span className="truncate text-caption font-medium">{m.competition}</span>
        </span>
        <span className="mt-1 block truncate text-body font-semibold text-foreground">
          {m.homeTeam} <span className="font-normal text-secondary">v</span> {m.awayTeam}
        </span>
      </span>
      {m.status === "live" ? (
        <LiveBadge />
      ) : (
        <span className="shrink-0 text-right text-caption tabular-nums text-secondary">
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
  const sideInk = side === "yes" ? "text-yes-ink" : "text-no-ink";

  function flash(kind: "code" | "link") {
    setCopied(kind);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(null), 1500);
  }

  async function share() {
    // A challenge link opens the room straight on the other side for them.
    const other = side === "yes" ? "no" : "yes";
    // The code rides on the link: a private room only opens for someone who
    // has it, and without it a friend tapping the link would hit "not found".
    const params = new URLSearchParams();
    if (inviteCode) params.set("code", inviteCode);
    if (vs) params.set("side", other);
    const qs = params.toString();
    const url = withRef(siteUrl(`/rooms/${roomId}${qs ? `?${qs}` : ""}`));
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
      <p className={`enter-row text-label font-semibold ${sideInk}`}>You created the room</p>
      <h1 className="enter-row mt-2 text-title-1 font-display text-foreground md:text-display">{vs ? `Now send it to @${vs}.` : "Now find your rival."}</h1>

      <div className="mt-6">
        <RoomPreviewCard match={match} claim={claim} side={side} meta={meta} confirmed />
      </div>
      <p className="enter-row mt-3 text-body text-secondary">
        You&rsquo;re in with <span className="font-semibold tabular-nums text-foreground">{formatMoney(stakeCents)}</span> on{" "}
        <span className={`font-semibold ${sideInk}`}>
          {side === "yes" ? "YES" : "NO"}
        </span>
        , locked in escrow. A room without opponents isn&rsquo;t a room.
      </p>
      <a
        href={explorerTxUrl(signature)}
        target="_blank"
        rel="noopener noreferrer"
        className="enter-row hover-link mt-2 inline-flex items-center gap-1 text-caption text-secondary underline underline-offset-2"
      >
        Verify your stake on Solana ↗
      </a>

      <div className="enter-row mt-6 flex items-center gap-2">
        <code className="flex h-12 flex-1 items-center rounded-control bg-surface px-4 font-mono text-body font-semibold text-foreground edge">
          {inviteCode}
        </code>
        <Button variant="secondary" size="lg" onClick={() => navigator.clipboard.writeText(inviteCode).then(() => flash("code"))}>
          {copied === "code" ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" className={sideInk} onClick={share}>
          {copied === "link" ? "Link copied" : vs ? `Send to @${vs}` : "Challenge a rival"}
        </Button>
        <ButtonLink href={`/rooms/${roomId}`} variant={side} size="lg">
          Open room →
        </ButtonLink>
      </div>
    </main>
  );
}
