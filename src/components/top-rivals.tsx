"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatMoneyCompact } from "@/lib/mock-data";
import { RivalCharacter } from "./rival-character";
import { TeamCrest } from "./team-crest";
import { AutoScrollRow } from "./auto-scroll-row";
import { RivalDivider } from "./rival-divider";
import { Card, Skeleton } from "./ui/surfaces";

// Home's rivals row — one continuously auto-scrolling strip of three groups:
//   Top rivals   — the biggest single wins, each tied to the room that paid
//                  it (top_payouts)
//   Goated       — current win streaks of 3+ (top_streaks)
//   Hall of fame — all-time profit (top_earners)
// All real data (public, settled rooms only). A group with nobody in it yet
// simply doesn't show; with nobody anywhere, the row says so and invites the
// first room. Never sample people. FOMO-style cards;
// tapping one pauses the row and opens the story beneath it.
//
// Engagement mechanisms (.claude/skills/rivaly-engagement-psychology):
// #5 social identity/rivalry — named people, not an anonymous ranking;
// #6 streaks — Goated makes a hot run visible; #9 social proof — specific,
// recent wins by people like you.
interface TopWin {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  payoutCents: number;
  stakeCents: number;
  roomId: string;
  prediction: string;
  side: "yes" | "no";
  poolTotalCents: number;
  participantCount: number;
  homeTeam: string;
  awayTeam: string;
  competition: string;
}

interface Streak {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  streak: number;
}
interface Earner {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  profitCents: number;
  roomsWon: number;
}

type Row = Record<string, unknown>;
const person = (r: Row) => ({
  userId: r.user_id as string,
  username: r.username as string,
  displayName: (r.display_name as string) || (r.username as string),
  avatarUrl: (r.avatar_url as string | null) ?? null,
});

function toWin(r: Row): TopWin {
  return {
    ...person(r),
    payoutCents: Number(r.payout_cents),
    stakeCents: Number(r.stake_cents),
    roomId: r.room_id as string,
    prediction: r.prediction as string,
    side: r.side as "yes" | "no",
    poolTotalCents: Number(r.pool_total_cents),
    participantCount: Number(r.participant_count),
    homeTeam: r.home_team as string,
    awayTeam: r.away_team as string,
    competition: r.competition as string,
  };
}

interface Boards {
  wins: TopWin[];
  streaks: Streak[];
  earners: Earner[];
}

// One read shared by every TopRivals on the page (Home shows the strip on
// phones and the side column on wide screens — both mounted, one hidden), and
// reused for 30s so switching tabs back doesn't ask again.
let boardsRead: { at: number; promise: Promise<Boards> } | null = null;
function loadBoards(): Promise<Boards> {
  if (boardsRead && Date.now() - boardsRead.at < 30_000) return boardsRead.promise;
  const supabase = createClient();
  const rows = (fn: string) =>
    supabase.rpc(fn, { p_limit: 5 }).then(
      ({ data }) => (data ?? []) as Row[],
      () => [] as Row[],
    );
  const promise = Promise.all([rows("top_payouts"), rows("top_streaks"), rows("top_earners")]).then(([w, s, e]) => ({
    wins: w.map(toWin),
    streaks: s.map((r) => ({ ...person(r), streak: Number(r.streak) })),
    earners: e.map((r) => ({ ...person(r), profitCents: Number(r.profit_cents), roomsWon: Number(r.rooms_won) })),
  }));
  boardsRead = { at: Date.now(), promise };
  return promise;
}

function useBoards(): Boards & { isLoading: boolean } {
  const [state, setState] = useState({ wins: [] as TopWin[], streaks: [] as Streak[], earners: [] as Earner[], isLoading: true });
  useEffect(() => {
    let cancelled = false;
    void loadBoards().then((b) => {
      if (!cancelled) setState({ ...b, isLoading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

const profit = (w: TopWin) => w.payoutCents - w.stakeCents;

type Group = "top" | "goated" | "hof";
interface RivalItem {
  key: string;
  group: Group;
  name: string;
  username: string;
  avatarUrl: string | null;
  metric: ReactNode;
  achievement: string;
  win?: TopWin;
}

const HEADINGS: Record<Group, string> = { top: "Top rivals", goated: "Goated rivals", hof: "Hall of fame" };

function buildItems(wins: TopWin[], streaks: Streak[], earners: Earner[]): RivalItem[] {
  const top: RivalItem[] = wins.length
    ? wins.map((w) => ({
        key: `top-${w.userId}`,
        group: "top",
        name: w.displayName,
        username: w.username,
        avatarUrl: w.avatarUrl,
        win: w,
        achievement: `Won ${formatMoney(profit(w))} on one call`,
        metric: (
          <>
            <span className="flex shrink-0 -space-x-1">
              <TeamCrest name={w.homeTeam} size={16} />
              <TeamCrest name={w.awayTeam} size={16} />
            </span>
            <span className="truncate text-label font-semibold tabular-nums text-money-ink">+{formatMoneyCompact(profit(w))}</span>
          </>
        ),
      }))
    : [];

  const goated: RivalItem[] = streaks.length
    ? streaks.map((s) => ({
        key: `goated-${s.userId}`,
        group: "goated",
        name: s.displayName,
        username: s.username,
        avatarUrl: s.avatarUrl,
        achievement: `${s.streak} rooms won in a row — and counting`,
        metric: <span className="truncate text-label font-semibold tabular-nums text-warning">🔥 {s.streak} in a row</span>,
      }))
    : [];

  const hof: RivalItem[] = earners.length
    ? earners.map((e) => ({
        key: `hof-${e.userId}`,
        group: "hof",
        name: e.displayName,
        username: e.username,
        avatarUrl: e.avatarUrl,
        achievement: `${formatMoney(e.profitCents)} profit across ${e.roomsWon} winning room${e.roomsWon === 1 ? "" : "s"}`,
        metric: <span className="truncate text-label font-semibold tabular-nums text-money-ink">👑 {formatMoneyCompact(e.profitCents)}</span>,
      }))
    : [];

  return [...top, ...goated, ...hof];
}

// `variant="rail"`: the same rivals as a vertical list for Home's right-hand
// column on wide screens (like Polymarket's "Hot topics") — same people, same
// tap-to-open story; only the shape changes.
export function TopRivals({ variant = "row" }: { variant?: "row" | "rail" } = {}) {
  const { wins, streaks, earners, isLoading } = useBoards();
  const [heading, setHeading] = useState(HEADINGS.top);
  const [openKey, setOpenKey] = useState<string | null>(null);
  // Keeps showing the last story while the panel collapses.
  const [storyKey, setStoryKey] = useState<string | null>(null);

  const items = isLoading ? [] : buildItems(wins, streaks, earners);
  const story = items.find((i) => i.key === storyKey) ?? null;

  function toggle(key: string) {
    const opening = openKey !== key;
    setOpenKey(opening ? key : null);
    if (opening) setStoryKey(key);
  }

  const card = (item: RivalItem) => {
    const active = item.key === openKey;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => toggle(item.key)}
        aria-expanded={active}
        className={`flex w-[150px] shrink-0 flex-col gap-3 rounded-card p-3 text-left outline outline-1 -outline-offset-1 transition-[transform,background-color,outline-color] duration-100 ease-out active:scale-[0.97] ${
          active ? "bg-money-tint outline-money" : "bg-surface outline-line"
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <RivalCharacter name={item.username} imageUrl={item.avatarUrl} size={28} />
          <span className="min-w-0 truncate text-label font-semibold text-foreground">{item.name}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2 rounded-control bg-background px-2 py-2">{item.metric}</span>
      </button>
    );
  };

  const groups: Group[] = ["top", "goated", "hof"];

  const storyPanel = (
    <div className="accordion-body" data-open={openKey ? "true" : "false"}>
      <div className="min-h-0 overflow-hidden">
        {story &&
          (story.win ? (
            <WinStory win={story.win} onClose={() => setOpenKey(null)} />
          ) : (
            <ProfileStory item={story} onClose={() => setOpenKey(null)} />
          ))}
      </div>
    </div>
  );

  if (variant === "rail") {
    const railRow = (item: RivalItem) => {
      const active = item.key === openKey;
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => toggle(item.key)}
          aria-expanded={active}
          className={`press-row flex w-full min-w-0 items-center gap-3 rounded-control px-2 py-2 text-left transition-colors duration-100 ${active ? "bg-money-tint" : "hover:bg-overlay-1"}`}
        >
          <RivalCharacter name={item.username} imageUrl={item.avatarUrl} size={28} />
          <span className="min-w-0 flex-1 truncate text-label font-semibold text-foreground">{item.name}</span>
          <span className="flex min-w-0 shrink-0 items-center gap-2">{item.metric}</span>
        </button>
      );
    };
    return (
      <section className="min-w-0">
        <h2 className="text-title-3 font-display text-foreground">{HEADINGS.top}</h2>
        <div className="mt-3 min-w-0">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-control" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <p className="text-body font-semibold text-foreground">No winners yet.</p>
              <p className="mt-1 text-body text-secondary">
                The first room to settle puts someone here.{" "}
                <Link href="/rooms/create" className="font-semibold text-yes-ink">
                  Start one →
                </Link>
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((g, gi) => {
                const inGroup = items.filter((i) => i.group === g);
                if (inGroup.length === 0) return null;
                return (
                  <div key={g} className="flex flex-col gap-1">
                    {gi > 0 && <p className="px-2 text-label font-semibold text-secondary">{HEADINGS[g]}</p>}
                    {inGroup.map(railRow)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {storyPanel}
      </section>
    );
  }

  const row = groups.flatMap((g, gi) => {
    const inGroup = items.filter((i) => i.group === g);
    if (inGroup.length === 0) return [];
    const divider =
      gi > 0 ? [<RivalDivider key={`div-${g}`} emoji={g === "goated" ? "🔥" : "👑"} label={g === "goated" ? "Goated" : "Hall of fame"} sectionHeading={HEADINGS[g]} />] : [];
    return [...divider, ...inGroup.map(card)];
  });

  return (
    <section className="min-w-0">
      <h2 className="text-title-3 font-display text-foreground">{heading}</h2>

      <div className="mt-4 min-w-0">
        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[92px] w-[150px] shrink-0 rounded-card" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <p className="text-body font-semibold text-foreground">No winners yet.</p>
            <p className="mt-1 text-body text-secondary">
              The first room to settle puts someone here.{" "}
              <Link href="/rooms/create" className="font-semibold text-yes-ink">
                Start one →
              </Link>
            </p>
          </Card>
        ) : (
          <AutoScrollRow itemCount={items.length} initialSectionLabel={HEADINGS.top} onActiveSectionChange={setHeading} paused={openKey !== null}>
            {row}
          </AutoScrollRow>
        )}
      </div>

      {/* The story behind the selected card — slides open beneath the row. */}
      {storyPanel}

    </section>
  );
}

function ProfileStory({ item, onClose }: { item: RivalItem; onClose: () => void }) {
  return (
    <Card className="mt-3">
      <div className="flex items-start gap-3">
        <RivalCharacter name={item.username} imageUrl={item.avatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-title-3 font-display text-foreground">{item.name}</p>
          <p className="truncate text-caption text-secondary">
            {HEADINGS[item.group]}
            {` · @${item.username}`}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="relative text-secondary transition-colors before:absolute before:-inset-3 hover:text-foreground">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-control bg-background px-3 py-3">{item.metric}</div>
      <p className="mt-2 text-body text-foreground">{item.achievement}</p>
      <Link href={`/profile/${item.username}`} className="mt-3 block text-center text-label font-semibold text-yes-ink">
        See {item.name}&rsquo;s profile
      </Link>
    </Card>
  );
}

function WinStory({ win, onClose }: { win: TopWin; onClose: () => void }) {
  const sideColor = win.side === "yes" ? "var(--yes-ink)" : "var(--no-ink)";
  return (
    <Card className="mt-3">
      <div className="flex items-start gap-3">
        <RivalCharacter name={win.username} imageUrl={win.avatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-title-3 font-display text-foreground">{win.displayName}</p>
          <p className="truncate text-caption text-secondary">@{win.username}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="relative text-secondary transition-colors before:absolute before:-inset-3 hover:text-foreground">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="mt-3 text-body text-foreground">
        Took home <span className="font-semibold tabular-nums text-money-ink">{formatMoney(win.payoutCents)}</span> backing{" "}
        <span className="font-semibold" style={{ color: sideColor }}>
          {win.side.toUpperCase()}
        </span>{" "}
        on:
      </p>

      <Link
        href={`/rooms/${win.roomId}`}
        className="mt-2 flex items-center gap-3 rounded-control bg-background p-3 transition-transform duration-100 ease-out active:scale-[0.98]"
      >
        <span className="flex shrink-0 -space-x-1.5">
          <TeamCrest name={win.homeTeam} size={24} />
          <TeamCrest name={win.awayTeam} size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label font-semibold text-foreground">{win.prediction}</span>
          <span className="block truncate text-caption text-secondary">
            {win.competition} · {win.participantCount} rivals · {formatMoneyCompact(win.poolTotalCents)} pool
          </span>
        </span>
        <span className="text-secondary">→</span>
      </Link>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Staked" value={formatMoneyCompact(win.stakeCents)} />
        <Stat label="Paid" value={formatMoneyCompact(win.payoutCents)} accent />
        <Stat label="Profit" value={`+${formatMoneyCompact(profit(win))}`} accent />
      </div>

      <Link href={`/profile/${win.username}`} className="mt-3 block text-center text-label font-semibold text-yes-ink">
        See {win.displayName}&rsquo;s profile
      </Link>
    </Card>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-control bg-background px-2 py-2">
      <p className={`text-label font-semibold tabular-nums ${accent ? "text-money-ink" : "text-foreground"}`}>{value}</p>
      <p className="mt-1 text-caption text-secondary">{label}</p>
    </div>
  );
}
