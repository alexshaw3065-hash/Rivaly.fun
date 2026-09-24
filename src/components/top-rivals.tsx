"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatMoney, formatMoneyCompact } from "@/lib/mock-data";
import { RivalCharacter } from "./rival-character";
import { TeamCrest } from "./team-crest";

// Home's Top rivals: the five biggest real wins — one per person — each tied
// to the room that paid it (top_payouts() in Postgres; public, settled rooms
// only). FOMO-style cards: the character and name, then the crest of the
// match that paid and the winnings. Tapping a card opens the story beneath
// the row: what they called, what they staked, what they took home.
//
// Engagement mechanisms (.claude/skills/rivaly-engagement-psychology):
// #5 social identity/rivalry — named people, not an anonymous ranking; and
// #9 social proof — real, specific, recent wins by people like you. Before
// anyone has won, the row shows open slots instead of invented winners.
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

function useTopWins(): { wins: TopWin[]; isLoading: boolean } {
  const [state, setState] = useState<{ wins: TopWin[]; isLoading: boolean }>({ wins: [], isLoading: true });
  useEffect(() => {
    let cancelled = false;
    createClient()
      .rpc("top_payouts", { p_limit: 5 })
      .then(
        ({ data }) => {
          if (cancelled) return;
          const rows = (data ?? []) as Record<string, unknown>[];
          setState({
            isLoading: false,
            wins: rows.map((r) => ({
              userId: r.user_id as string,
              username: r.username as string,
              displayName: (r.display_name as string) || (r.username as string),
              avatarUrl: (r.avatar_url as string | null) ?? null,
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
            })),
          });
        },
        () => !cancelled && setState({ wins: [], isLoading: false }),
      );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

const profit = (w: TopWin) => w.payoutCents - w.stakeCents;

export function TopRivals() {
  const { wins, isLoading } = useTopWins();
  const [openId, setOpenId] = useState<string | null>(null);
  // The panel keeps showing the last story while it collapses, instead of
  // emptying the instant it starts closing.
  const [storyId, setStoryId] = useState<string | null>(null);
  const story = wins.find((w) => w.userId === storyId) ?? null;

  return (
    <section className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-foreground">Top rivals</h2>
        <p className="truncate text-xs text-muted">Biggest wins · the rooms that paid them</p>
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-[104px] w-[150px] shrink-0 snap-start rounded-xl border border-border bg-surface md:w-auto" aria-hidden />
            ))
          : wins.length > 0
            ? wins.map((w, i) => {
                const active = w.userId === openId;
                return (
                  <button
                    key={w.userId}
                    type="button"
                    onClick={() => {
                      setOpenId(active ? null : w.userId);
                      if (!active) setStoryId(w.userId);
                    }}
                    aria-expanded={active}
                    className="stagger-in flex w-[150px] shrink-0 snap-start flex-col gap-2.5 rounded-xl border bg-surface p-3 text-left transition-[transform,border-color,background-color] duration-150 ease-out active:scale-[0.97] md:w-auto"
                    style={{
                      animationDelay: `${i * 45}ms`,
                      borderColor: active ? "var(--rival-green)" : "var(--border)",
                      background: active ? "var(--rival-green-dim)" : undefined,
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <RivalCharacter name={w.username} imageUrl={w.avatarUrl} size={28} />
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground">{w.displayName}</span>
                    </span>
                    <span className="flex items-center gap-2 rounded-lg bg-background px-2.5 py-2">
                      <span className="flex shrink-0 -space-x-1">
                        <TeamCrest name={w.homeTeam} size={16} />
                        <TeamCrest name={w.awayTeam} size={16} />
                      </span>
                      <span className="truncate font-mono text-sm font-semibold text-rival-green" title={formatMoney(profit(w))}>
                        +{formatMoneyCompact(profit(w))}
                      </span>
                    </span>
                  </button>
                );
              })
            : Array.from({ length: 5 }, (_, i) => <OpenSlot key={i} rank={i + 1} />)}
      </div>

      {/* The story behind the selected win — slides open beneath the row. */}
      <div className="accordion-body" data-open={openId ? "true" : "false"}>
        <div className="min-h-0 overflow-hidden">{story && <WinStory win={story} onClose={() => setOpenId(null)} />}</div>
      </div>

      {!isLoading && wins.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          No room has paid out yet — the first five winners land here.{" "}
          <Link href="/rooms/create" className="font-medium text-rival-blue">
            Start a room →
          </Link>
        </p>
      )}
    </section>
  );
}

function OpenSlot({ rank }: { rank: number }) {
  return (
    <div className="flex w-[150px] shrink-0 snap-start flex-col gap-2.5 rounded-xl border border-dashed border-border-strong p-3 md:w-auto">
      <span className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-dashed border-border-strong font-mono text-xs text-muted">
          {rank}
        </span>
        <span className="text-sm font-medium text-muted">Your name</span>
      </span>
      <span className="rounded-lg bg-surface px-2.5 py-2 font-mono text-sm text-muted">+$—</span>
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
