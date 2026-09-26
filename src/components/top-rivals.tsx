"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatMoneyCompact } from "@/lib/mock-data";
import { RivalCharacter } from "./rival-character";
import { TeamCrest } from "./team-crest";
import { AutoScrollRow } from "./auto-scroll-row";
import { RivalDivider } from "./rival-divider";

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

function useBoards(): { wins: TopWin[]; streaks: Streak[]; earners: Earner[]; isLoading: boolean } {
  const [state, setState] = useState({ wins: [] as TopWin[], streaks: [] as Streak[], earners: [] as Earner[], isLoading: true });
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const rows = (fn: string) =>
      supabase.rpc(fn, { p_limit: 5 }).then(
        ({ data }) => (data ?? []) as Row[],
        () => [] as Row[],
      );
    Promise.all([rows("top_payouts"), rows("top_streaks"), rows("top_earners")]).then(([w, s, e]) => {
      if (cancelled) return;
      setState({
        isLoading: false,
        wins: w.map(toWin),
        streaks: s.map((r) => ({ ...person(r), streak: Number(r.streak) })),
        earners: e.map((r) => ({ ...person(r), profitCents: Number(r.profit_cents), roomsWon: Number(r.rooms_won) })),
      });
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
            <span className="truncate font-mono text-sm font-semibold text-rival-green">+{formatMoneyCompact(profit(w))}</span>
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
        metric: <span className="truncate font-mono text-sm font-semibold text-[#f5a524]">🔥 {s.streak} in a row</span>,
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
        metric: <span className="truncate font-mono text-sm font-semibold text-rival-green">👑 {formatMoneyCompact(e.profitCents)}</span>,
      }))
    : [];

  return [...top, ...goated, ...hof];
}

export function TopRivals() {
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
        className="flex w-[150px] shrink-0 flex-col gap-2.5 rounded-xl border bg-surface p-3 text-left transition-[transform,border-color,background-color] duration-150 ease-out active:scale-[0.97]"
        style={{
          borderColor: active ? "var(--rival-green)" : "var(--border)",
          background: active ? "var(--rival-green-dim)" : undefined,
        }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <RivalCharacter name={item.username} imageUrl={item.avatarUrl} size={28} />
          <span className="min-w-0 truncate text-sm font-semibold text-foreground">{item.name}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2 rounded-lg bg-background px-2.5 py-2">{item.metric}</span>
      </button>
    );
  };

  const groups: Group[] = ["top", "goated", "hof"];
  const row = groups.flatMap((g, gi) => {
    const inGroup = items.filter((i) => i.group === g);
    if (inGroup.length === 0) return [];
    const divider =
      gi > 0 ? [<RivalDivider key={`div-${g}`} emoji={g === "goated" ? "🔥" : "👑"} label={g === "goated" ? "Goated" : "Hall of fame"} sectionHeading={HEADINGS[g]} />] : [];
    return [...divider, ...inGroup.map(card)];
  });

  return (
    <section className="min-w-0">
      <h2 className="font-display text-xl font-semibold text-foreground">{heading}</h2>

      <div className="mt-4 min-w-0">
        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-[92px] w-[150px] shrink-0 rounded-xl border border-border bg-surface" aria-hidden />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-5">
            <p className="text-sm text-foreground">No winners yet.</p>
            <p className="mt-0.5 text-sm text-muted">
              The first room to settle puts someone here.{" "}
              <Link href="/rooms/create" className="font-medium text-rival-blue">
                Start one →
              </Link>
            </p>
          </div>
        ) : (
          <AutoScrollRow itemCount={items.length} initialSectionLabel={HEADINGS.top} onActiveSectionChange={setHeading} paused={openKey !== null}>
            {row}
          </AutoScrollRow>
        )}
      </div>

      {/* The story behind the selected card — slides open beneath the row. */}
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


    </section>
  );
}

function ProfileStory({ item, onClose }: { item: RivalItem; onClose: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <RivalCharacter name={item.username} imageUrl={item.avatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-foreground">{item.name}</p>
          <p className="truncate text-xs text-muted">
            {HEADINGS[item.group]}
            {` · @${item.username}`}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-foreground">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-background px-3 py-2.5">{item.metric}</div>
      <p className="mt-2 text-sm text-foreground">{item.achievement}</p>
      <Link href={`/profile/${item.username}`} className="mt-3 block text-center text-sm font-medium text-rival-blue">
        See {item.name}&rsquo;s profile
      </Link>
    </div>
  );
}

function WinStory({ win, onClose }: { win: TopWin; onClose: () => void }) {
  const sideColor = win.side === "yes" ? "var(--rival-blue)" : "var(--rival-red)";
  return (
    <div className="mt-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <RivalCharacter name={win.username} imageUrl={win.avatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold text-foreground">{win.displayName}</p>
          <p className="truncate text-xs text-muted">@{win.username}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-foreground">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="mt-3 text-sm text-foreground">
        Took home <span className="font-mono font-semibold text-rival-green">{formatMoney(win.payoutCents)}</span> backing{" "}
        <span className="font-semibold" style={{ color: sideColor }}>
          {win.side.toUpperCase()}
        </span>{" "}
        on:
      </p>

      <Link
        href={`/rooms/${win.roomId}`}
        className="mt-2 flex items-center gap-3 rounded-lg bg-background p-3 transition-transform duration-150 ease-out active:scale-[0.98]"
      >
        <span className="flex shrink-0 -space-x-1.5">
          <TeamCrest name={win.homeTeam} size={24} />
          <TeamCrest name={win.awayTeam} size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{win.prediction}</span>
          <span className="block truncate text-xs text-muted">
            {win.competition} · {win.participantCount} rivals · {formatMoneyCompact(win.poolTotalCents)} pool
          </span>
        </span>
        <span className="text-muted">→</span>
      </Link>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Staked" value={formatMoneyCompact(win.stakeCents)} />
        <Stat label="Paid" value={formatMoneyCompact(win.payoutCents)} accent />
        <Stat label="Profit" value={`+${formatMoneyCompact(profit(win))}`} accent />
      </div>

      <Link href={`/profile/${win.username}`} className="mt-3 block text-center text-sm font-medium text-rival-blue">
        See {win.displayName}&rsquo;s profile
      </Link>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-background px-2 py-2">
      <p className="font-mono text-sm font-semibold" style={{ color: accent ? "var(--rival-green)" : "var(--foreground)" }}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  );
}
