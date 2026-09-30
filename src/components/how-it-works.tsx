"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Drawer } from "vaul";
import { Button } from "./ui";
import { TeamCrest } from "./team-crest";
import { useCurrentUser } from "./current-user-provider";
import { closeHowItWorks, howItWorksSeen, markHowItWorksSeen, openHowItWorks, useHowItWorksOpen } from "@/lib/how-it-works-store";
import { track } from "@/lib/analytics/track";

// "How it works" in three steps, each shown as the real thing rather than
// described: the call card, the two sides with the pot locked, the result
// and the payout. Opens by itself once, on Home, for someone new (signed out,
// never seen it); after that it's in the menu and the desktop header.
//
// The example is an illustration — "You" vs "Rival", not real people — and
// its numbers are what the app would really pay: $10 each side, the winner
// gets $19.50 (their $10 back plus the $10 they won, minus 5% of that $10 —
// planSettlement in lib/settlement/payouts.ts). The fee itself isn't named
// here (founder's call): it's on the stake panel before anyone plays, on
// results and receipts, and in the full guide.
//
// Engagement mechanisms (rivaly-engagement-psychology): #2 anticipation — the
// pot locked until the result is decided is the beat before the whistle; #5 rivalry — it's
// you against a named side, not odds against a house.

const HOME = "Arsenal";
const AWAY = "Chelsea";

const STEPS = [
  {
    title: "Create a prediction",
    body: "Pick a real match and say what'll happen — Arsenal win, over 2.5 goals, Saka scores. Your prediction becomes a room.",
  },
  {
    title: "A rival takes the other side",
    body: "Anyone on Rivaly who disagrees can take the other side — or send the room to a friend you want to beat. Every stake is locked until the result is decided.",
  },
  {
    title: "Winner gets paid",
    body: "The official result settles it and the winners are paid straight to their wallets, automatically. Rivaly never bets against you.",
  },
] as const;

export function HowItWorksHost() {
  const open = useHowItWorksOpen();
  const pathname = usePathname();
  const me = useCurrentUser();

  // First visit to Home, signed out: open once, just after the page settles.
  useEffect(() => {
    if (pathname !== "/" || me || howItWorksSeen()) return;
    const t = window.setTimeout(() => openHowItWorks("first_visit"), 900);
    return () => window.clearTimeout(t);
  }, [pathname, me]);

  // Any way it opens counts as seen.
  useEffect(() => {
    if (open) markHowItWorksSeen();
  }, [open]);

  return (
    <Drawer.Root open={open} onOpenChange={(next) => !next && closeHowItWorks()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-scrim" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-sheet bg-surface shadow-sheet outline-none"
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong" />
          <Drawer.Title className="sr-only">How Rivaly works</Drawer.Title>
          {/* Remounts on every open, so it always starts at step one. */}
          {open && <Steps />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Steps() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const last = step === STEPS.length - 1;
  const s = STEPS[step];

  function go(href: string, action: string) {
    track("how_it_works_done", { action });
    closeHowItWorks();
    router.push(href);
  }

  return (
    <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-4">
      <div className="flex items-center justify-between">
        <p className="text-caption tabular-nums text-tertiary">
          {step + 1} of {STEPS.length}
        </p>
        {!last && (
          <button type="button" onClick={closeHowItWorks} className="text-label text-secondary hover:text-foreground">
            Skip
          </button>
        )}
      </div>

      {/* The stage: the step, shown. Fixed height so the sheet never jumps between steps. */}
      <div className="mt-3 flex h-[188px] items-center justify-center overflow-hidden rounded-card bg-background px-5 edge">
        <div key={step} className="w-full max-w-[300px]" style={{ animation: "fade-in-up var(--dur-standard) var(--ease-out) both" }}>
          {step === 0 && <CallVisual />}
          {step === 1 && <SidesVisual />}
          {step === 2 && <ResultVisual />}
        </div>
      </div>

      <div key={`t${step}`} className="mt-4 min-h-[104px]" style={{ animation: "fade-in-up var(--dur-standard) var(--ease-out) both" }}>
        <h2 className="font-display text-title-2 text-foreground">{s.title}</h2>
        <p className="mt-2 text-body text-secondary">{s.body}</p>
      </div>

      {/* Progress: one segment per step. */}
      <div className="mt-4 flex gap-1.5" aria-hidden>
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= step ? "bg-foreground" : "bg-line-strong"}`} />
        ))}
      </div>

      {last ? (
        <div className="mt-5 flex flex-col gap-3">
          <Button variant="primary" size="cta" onClick={() => go("/rooms/create", "create")}>
            Make your first call
          </Button>
          <div className="flex items-center justify-center gap-5 text-label">
            <button type="button" onClick={() => go("/rooms", "browse")} className="font-semibold text-foreground hover:underline">
              See live rooms
            </button>
            <Link href="/docs" onClick={closeHowItWorks} className="text-secondary hover:text-foreground">
              Full guide
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex gap-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button variant="primary" size="lg" full onClick={() => setStep(step + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ── The three pictures ───────────────────────────────────────────────

function Fixture({ score }: { score?: [number, number] }) {
  return (
    <div className="flex items-center justify-between gap-2 text-label text-foreground">
      <span className="flex min-w-0 items-center gap-2">
        <TeamCrest name={HOME} size={22} />
        <span className="truncate font-semibold">{HOME}</span>
      </span>
      <span className="shrink-0 font-display text-body-lg tabular-nums text-foreground">{score ? `${score[0]}–${score[1]}` : "vs"}</span>
      <span className="flex min-w-0 items-center justify-end gap-2">
        <span className="truncate font-semibold">{AWAY}</span>
        <TeamCrest name={AWAY} size={22} />
      </span>
    </div>
  );
}

function CallVisual() {
  return (
    <div className="rounded-card bg-surface-elevated p-4 edge">
      <p className="text-caption text-tertiary">Premier League · Saturday</p>
      <div className="mt-3">
        <Fixture />
      </div>
      <p className="mt-4 font-display text-title-1 text-foreground">{HOME} win?</p>
      <p className="mt-1 text-caption text-yes-ink">Your call</p>
    </div>
  );
}

function SidesVisual() {
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-caption text-secondary">You</p>
          <p className="font-display text-title-3 text-yes-ink">YES $10</p>
        </div>
        <p className="pb-1 text-caption text-tertiary">vs</p>
        <div className="text-right">
          <p className="text-caption text-secondary">Rival</p>
          <p className="font-display text-title-3 text-no-ink">$10 NO</p>
        </div>
      </div>
      {/* Both sides fill in towards the middle: the pot coming together. */}
      <div className="mt-3 flex h-3 gap-1">
        <span className="flex-1 origin-left rounded-full bg-yes" style={{ animation: "side-fill 700ms var(--ease-out) 120ms both" }} />
        <span className="flex-1 origin-right rounded-full bg-no" style={{ animation: "side-fill 700ms var(--ease-out) 320ms both" }} />
      </div>
      <div className="mt-5 flex items-center justify-center gap-2 text-label text-foreground">
        <LockGlyph />
        <span>
          <span className="font-semibold tabular-nums">$20 pot</span> <span className="text-secondary">· locked until it’s decided</span>
        </span>
      </div>
    </div>
  );
}

function ResultVisual() {
  return (
    <div className="text-center">
      <p className="text-caption text-tertiary">Full time</p>
      <div className="mt-2">
        <Fixture score={[2, 1]} />
      </div>
      <p className="mt-3 text-label font-semibold text-yes-ink">YES wins · paid to your wallet</p>
      <p className="mt-1 font-display text-display tabular-nums text-money-ink">+$19.50</p>
      <p className="mt-1 text-caption text-secondary">Your $10 back + $9.50 won</p>
    </div>
  );
}

function LockGlyph() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
