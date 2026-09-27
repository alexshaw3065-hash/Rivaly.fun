"use client";

// Development-only preview of the kit. The "Today" column copies the exact
// markup currently used in the app (join-panel side buttons + CTA,
// complete-profile's Continue, room-feed chips, rooms tabs, room-card,
// BottomSheet, LiveBadge), so the comparison is honest.

import { useState, type ReactNode } from "react";
import { LiveBadge as TodayLiveBadge } from "@/components/live-badge";
import { BottomSheet } from "@/components/bottom-sheet";
import { TeamCrest } from "@/components/team-crest";
import { Amount, Badge, Button, Card, Chip, EmptyState, IconButton, ListGroup, ListRow, LiveBadge, SectionHeader, Segmented, Sheet, SidePill, Skeleton, Tabs } from "@/components/ui";

function Row({ label, today, kit }: { label: string; today: ReactNode; kit: ReactNode }) {
  return (
    <section className="border-b border-line py-6">
      <p className="mb-3 text-micro uppercase text-tertiary">{label}</p>
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
        <div>
          <p className="mb-2 text-caption text-tertiary">Today</p>
          {today}
        </div>
        <div>
          <p className="mb-2 text-caption text-yes-ink">Kit</p>
          {kit}
        </div>
      </div>
    </section>
  );
}

export function KitPreview() {
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [chip, setChip] = useState("trending");
  const [tab, setTab] = useState("discover");
  const [seg, setSeg] = useState("global");
  const [oldSheet, setOldSheet] = useState(false);
  const [newSheet, setNewSheet] = useState(false);
  const [pool, setPool] = useState(1000);
  const [pending, setPending] = useState(false);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <h1 className="text-title-1 font-display">Rivaly kit</h1>
      <p className="mt-1 text-body text-secondary">Phase 1 — each piece next to what the app uses today. Dev only.</p>

      <Row
        label="Pick a side"
        today={
          <div className="grid grid-cols-2 gap-2">
            {(["yes", "no"] as const).map((s) => {
              const active = side === s;
              const color = s === "yes" ? "var(--rival-blue)" : "var(--rival-red)";
              const dim = s === "yes" ? "var(--rival-blue-dim)" : "var(--rival-red-dim)";
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className="min-h-12 rounded-md border font-display text-base font-bold tracking-wide transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.97]"
                  style={{ borderColor: active ? color : "var(--border)", color: active ? color : "var(--muted)", background: active ? dim : "transparent", boxShadow: active ? `inset 0 0 0 1px ${color}` : "none" }}
                >
                  {s.toUpperCase()}
                </button>
              );
            })}
          </div>
        }
        kit={
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            <SidePill side="yes" selected={side === "yes"} meta="64%" onClick={() => setSide("yes")} />
            <SidePill side="no" selected={side === "no"} meta="36%" onClick={() => setSide("no")} />
          </div>
        }
      />

      <Row
        label="The main action"
        today={
          <button type="button" className="min-h-12 w-full rounded-md text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.98]" style={{ background: "var(--rival-blue)" }}>
            Join with $10 on YES
          </button>
        }
        kit={
          <Button
            variant={side}
            size="cta"
            pending={pending}
            onClick={() => {
              setPending(true);
              window.setTimeout(() => setPending(false), 1400);
            }}
          >
            {pending ? "Joining…" : `Throw down $10 on ${side.toUpperCase()}`}
          </Button>
        }
      />

      <Row
        label="Buttons"
        today={
          <div className="flex flex-col gap-2">
            <button type="button" className="w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]">
              Continue
            </button>
            <button type="button" className="rounded-full border border-border-strong px-4 py-2 text-sm text-foreground transition-transform duration-150 ease-out active:scale-[0.97]">
              Back to top ↑
            </button>
          </div>
        }
        kit={
          <div className="flex flex-col gap-2">
            <Button variant="primary" size="lg" full>
              Start the first room
            </Button>
            <Button variant="inverse" size="lg" full>
              Continue
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary">Share</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Leave</Button>
            </div>
            <div className="flex items-center gap-2">
              <IconButton label="Bookmark">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M5.5 3.5h9v13l-4.5-3-4.5 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </IconButton>
              <IconButton label="Share" variant="surface">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M10 3v9M6.5 6.5 10 3l3.5 3.5M5 10v6h10v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
              <Button variant="money" size="sm">
                Claim $4.20
              </Button>
            </div>
          </div>
        }
      />

      <Row
        label="Filter chips"
        today={
          <div className="flex flex-wrap gap-2">
            {["trending", "live", "new"].map((id) => {
              const selected = chip === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChip(id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm active:scale-[0.97]"
                  style={{ borderColor: selected ? "var(--foreground)" : "var(--border)", color: selected ? "var(--foreground)" : "var(--muted)", background: selected ? "var(--border-strong)" : "transparent" }}
                >
                  {id[0].toUpperCase() + id.slice(1)}
                </button>
              );
            })}
          </div>
        }
        kit={
          <div className="flex flex-wrap gap-2">
            {["trending", "live", "new"].map((id) => (
              <Chip key={id} selected={chip === id} onClick={() => setChip(id)}>
                {id[0].toUpperCase() + id.slice(1)}
              </Chip>
            ))}
          </div>
        }
      />

      <Row
        label="Tabs"
        today={
          <div className="flex gap-6 border-b border-border">
            {["discover", "live", "mine"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="-mb-px shrink-0 border-b-2 pb-2.5 text-sm font-medium transition-colors duration-150"
                style={{ borderColor: tab === t ? "var(--foreground)" : "transparent", color: tab === t ? "var(--foreground)" : "var(--muted)" }}
              >
                {t === "mine" ? "My Rooms" : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        }
        kit={
          <div className="flex flex-col gap-4">
            <Tabs
              tabs={[
                { id: "discover", label: "Discover" },
                { id: "live", label: "Live", count: 9 },
                { id: "mine", label: "My Rooms" },
              ]}
              value={tab}
              onChange={setTab}
            />
            <Segmented
              options={[
                { id: "global", label: "Global" },
                { id: "following", label: "Following" },
              ]}
              value={seg}
              onChange={setSeg}
            />
          </div>
        }
      />

      <Row
        label="Room card"
        today={
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TeamCrest name="San Francisco 49ers" size={18} />
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted">NFL</span>
              </span>
              <TodayLiveBadge />
            </div>
            <p className="text-lg font-medium leading-snug text-foreground">49ers to win</p>
            <div className="mt-1 flex items-center justify-between border-t border-border pt-3 font-mono text-xs text-muted">
              <span>$10 pool</span>
              <span>1 rival</span>
            </div>
          </div>
        }
        kit={
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TeamCrest name="San Francisco 49ers" size={18} />
                <span className="text-caption text-secondary">NFL</span>
              </span>
              <LiveBadge detail="Q3 5:44" />
            </div>
            <p className="text-title-3 font-display text-foreground">49ers to win</p>
            <div className="flex items-center justify-between text-caption text-secondary">
              <span>
                <Amount cents={pool} countUp className="font-semibold text-foreground" /> pool
              </span>
              <span className="tabular-nums">1 rival</span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setPool((p) => p + 2500)}>
              + $25 to the pool
            </Button>
          </Card>
        }
      />

      <Row
        label="Badges & numbers"
        today={
          <div className="flex flex-col gap-2">
            <TodayLiveBadge minute="67'" />
            <span className="font-mono text-xs text-muted">1h 28m</span>
            <span className="font-mono text-sm text-rival-green">+$14.60</span>
          </div>
        }
        kit={
          <div className="flex flex-col gap-2">
            <LiveBadge detail="67'" />
            <div className="flex gap-3">
              <Badge>FT</Badge>
              <Badge tone="yes">YES</Badge>
              <Badge tone="no">NO</Badge>
            </div>
            <span className="text-caption tabular-nums text-secondary">Kicks off in 1h 28m</span>
            <Amount cents={1460} signed tone="money" className="text-title-3 font-display" />
          </div>
        }
      />

      <Row
        label="Lists"
        today={
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {["warren", "uuyj"].map((u) => (
              <div key={u} className="flex items-center justify-between px-4 py-3.5">
                <p className="text-sm text-foreground">@{u}</p>
                <p className="font-mono text-sm text-muted">+$5</p>
              </div>
            ))}
          </div>
        }
        kit={
          <ListGroup>
            {["warren", "uuyj"].map((u) => (
              <ListRow
                key={u}
                inset={68}
                onClick={() => undefined}
                leading={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-label">{u[0].toUpperCase()}</span>}
                title={`@${u}`}
                subtitle="Took you on · 2h"
                trailing={<Amount cents={500} signed tone="money" />}
              />
            ))}
          </ListGroup>
        }
      />

      <Row
        label="Loading & empty"
        today={
          <div className="flex flex-col gap-2">
            <div className="h-[72px] rounded-lg border border-border bg-surface" />
            <p className="py-6 text-center text-sm text-muted">No rooms match this filter yet.</p>
          </div>
        }
        kit={
          <div className="flex flex-col gap-2">
            <Card className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </Card>
            <EmptyState title="No rooms on this match yet" body="Make the first call and let someone take the other side." action={<Button variant="primary">Start the first room</Button>} />
          </div>
        }
      />

      <Row
        label="Bottom sheet"
        today={
          <button type="button" onClick={() => setOldSheet(true)} className="w-full rounded-md border border-border py-3 text-sm text-foreground">
            Open today’s sheet
          </button>
        }
        kit={
          <Button variant="secondary" full size="lg" onClick={() => setNewSheet(true)}>
            Open the kit sheet
          </Button>
        }
      />

      <BottomSheet open={oldSheet} onClose={() => setOldSheet(false)} title="Filter by league">
        <p className="text-sm text-muted">Today&rsquo;s sheet: no drag-to-dismiss, fixed padding.</p>
      </BottomSheet>
      <Sheet
        open={newSheet}
        onOpenChange={setNewSheet}
        title="Filter by league"
        description="Drag down or flick to close."
        footer={
          <Button variant="inverse" size="cta" onClick={() => setNewSheet(false)}>
            Confirm
          </Button>
        }
      >
        <ListGroup>
          <ListRow title="All leagues" trailing="✓" onClick={() => undefined} />
          <ListRow title="Premier League" onClick={() => undefined} />
          <ListRow title="NFL" onClick={() => undefined} />
        </ListGroup>
      </Sheet>

      <SectionHeader title="Type ramp" action="9 steps" className="mt-8" />
      <div className="flex flex-col gap-2">
        <p className="text-display font-display">$240</p>
        <p className="text-title-1 font-display">You called it.</p>
        <p className="text-title-2 font-display">San Francisco 49ers to win</p>
        <p className="text-title-3 font-display">Exploding now</p>
        <p className="text-body-lg">Back your call against a real rival.</p>
        <p className="text-body text-secondary">Make the first call and let someone take the other side.</p>
        <p className="text-label">Label · buttons, chips, tabs</p>
        <p className="text-caption text-secondary">Caption · 2h ago · helper text</p>
        <p className="text-micro uppercase text-tertiary">Micro · badges only</p>
      </div>
    </main>
  );
}
