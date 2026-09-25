"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { DisplayChatMessage } from "@/lib/supabase/message-mapper";
import { decodeMoment, type EventTone } from "@/lib/match-event-label";
import { formatMoneyCompact } from "@/lib/mock-data";
import type { EntrySide } from "@/lib/types";
import { RivalCharacter } from "./rival-character";

// The room's chat as a full thread, Discord-style: a person's first message
// in a run carries their face, name (in the colour of the side they backed)
// and time, with their stake right under the face — who's talking and how
// much they've got riding on it, at a glance. Follow-ups within a few
// minutes stack under it without repeating any of that. Match moments are
// system lines in their own tone; days get a divider. It sticks to the
// newest message unless you've scrolled up to read, in which case new ones
// wait behind a "jump to present" bar instead of yanking you down.
//
// Engagement mechanisms #4 (collective effervescence — a live, synchronous
// crowd) and #5 (social identity — every line wears its side and stake).

const GROUP_MS = 5 * 60_000;
const NEAR_BOTTOM_PX = 80;
const SIDE_COLOR: Record<EntrySide, string> = { yes: "var(--rival-blue)", no: "var(--rival-red)" };
const SIDE_DIM: Record<EntrySide, string> = { yes: "var(--rival-blue-dim)", no: "var(--rival-red-dim)" };

const TONE: Record<EventTone, { color: string; icon: string }> = {
  goal: { color: "var(--rival-green)", icon: "⚽" },
  card: { color: "#f5c542", icon: "▮" },
  var: { color: "#14b8c4", icon: "▣" },
  whistle: { color: "var(--muted)", icon: "•" },
  "takeover-yes": { color: "var(--rival-blue)", icon: "🏟" },
  "takeover-no": { color: "var(--rival-red)", icon: "🏟" },
};

type Row =
  | { kind: "day"; id: string; label: string }
  | { kind: "system"; id: string; message: DisplayChatMessage }
  | { kind: "message"; id: string; message: DisplayChatMessage; head: boolean };

function dayLabel(d: Date, now: Date): string {
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, now)) return "Today";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function buildRows(items: DisplayChatMessage[], now: Date): Row[] {
  const rows: Row[] = [];
  let lastDay = "";
  let prev: DisplayChatMessage | null = null;
  for (const m of items) {
    const d = new Date(m.createdAt);
    if (d.toDateString() !== lastDay) {
      lastDay = d.toDateString();
      rows.push({ kind: "day", id: `day-${lastDay}`, label: dayLabel(d, now) });
      prev = null;
    }
    if (m.kind === "system") {
      rows.push({ kind: "system", id: m.id, message: m });
      prev = null;
      continue;
    }
    const head = !prev || prev.userId !== m.userId || +d - +new Date(prev.createdAt) > GROUP_MS;
    rows.push({ kind: "message", id: m.id, message: m, head });
    prev = m;
  }
  return rows;
}

export function ChatThread({
  items,
  sides,
  stakes,
  selfId,
  empty,
  onLoadEarlier,
  hasEarlier,
}: {
  items: DisplayChatMessage[];
  sides: Record<string, EntrySide>;
  stakes: Record<string, number>;
  selfId?: string;
  empty: ReactNode;
  onLoadEarlier?: () => Promise<void>;
  hasEarlier?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const [unseen, setUnseen] = useState(0);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const lastCount = useRef(items.length);
  const lastNewest = useRef(items[items.length - 1]?.id);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(t);
  }, []);
  const rows = buildRows(items, now ?? new Date(items[items.length - 1]?.createdAt ?? 0));

  // Open at the newest message.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // New at the bottom: follow if you're there, otherwise count it.
  useLayoutEffect(() => {
    const el = scroller.current;
    const newest = items[items.length - 1]?.id;
    const grew = items.length > lastCount.current;
    const appended = newest !== lastNewest.current;
    lastCount.current = items.length;
    lastNewest.current = newest;
    if (!el || !grew || !appended) return;
    if (atBottom.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    else setUnseen((n) => n + 1);
  }, [items]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (atBottom.current && unseen) setUnseen(0);
  };

  const jump = () => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setUnseen(0);
  };

  const loadEarlier = async () => {
    const el = scroller.current;
    if (!el || !onLoadEarlier || loadingEarlier) return;
    const before = el.scrollHeight;
    setLoadingEarlier(true);
    await onLoadEarlier();
    setLoadingEarlier(false);
    // Keep the reader where they were once older messages land above.
    requestAnimationFrame(() => {
      if (scroller.current) scroller.current.scrollTop += scroller.current.scrollHeight - before;
    });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-1">
        {hasEarlier && (
          <div className="flex justify-center py-2">
            <button type="button" onClick={loadEarlier} disabled={loadingEarlier} className="rounded-full px-3 py-1 text-xs font-semibold text-muted ring-1 ring-border transition-colors hover:text-foreground disabled:opacity-60">
              {loadingEarlier ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        )}
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center">{empty}</div>
        ) : (
          rows.map((r) =>
            r.kind === "day" ? (
              <DayDivider key={r.id} label={r.label} />
            ) : r.kind === "system" ? (
              <SystemLine key={r.id} message={r.message} />
            ) : (
              <MessageRow
                key={r.id}
                message={r.message}
                head={r.head}
                side={r.message.userId ? sides[r.message.userId] : undefined}
                stake={r.message.userId ? stakes[r.message.userId] : undefined}
                self={r.message.userId === selfId}
              />
            ),
          )
        )}
      </div>

      {unseen > 0 && (
        <button
          type="button"
          onClick={jump}
          className="absolute inset-x-3 bottom-2 flex h-9 items-center justify-between rounded-lg bg-rival-blue px-3 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.3)] [animation:fade-in-up_280ms_cubic-bezier(0.23,1,0.32,1)_both]"
        >
          <span>
            {unseen} new {unseen === 1 ? "message" : "messages"}
          </span>
          <span className="flex items-center gap-1">
            Jump to present
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-3 flex items-center gap-2" role="separator">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function SystemLine({ message }: { message: DisplayChatMessage }) {
  const moment = decodeMoment(message.body);
  const tone = TONE[moment.tone];
  // Most moment labels lead with their own emoji ("⚽ GOAL 63'") — use it
  // as the line's icon rather than showing it twice.
  const lead = moment.label.match(/^(\p{Extended_Pictographic}\uFE0F?)\s*/u);
  const icon = lead ? lead[1] : tone.icon;
  const label = lead ? moment.label.slice(lead[0].length) : moment.label;
  const big = moment.tone === "goal" || moment.tone.startsWith("takeover");
  return (
    <div
      className={`chat-row-enter my-1.5 flex items-center gap-2.5 rounded-lg px-2 ${big ? "py-2" : "py-1"}`}
      style={big ? { background: `color-mix(in srgb, ${tone.color} 10%, transparent)`, boxShadow: `inset 3px 0 0 ${tone.color}` } : undefined}
    >
      <span className="flex w-9 shrink-0 justify-center text-sm" style={{ color: tone.color }} aria-hidden>
        {icon}
      </span>
      <span className={`min-w-0 flex-1 text-[13px] ${big ? "font-bold" : "font-medium"}`} style={{ color: big ? tone.color : "var(--foreground)" }}>
        {label}
      </span>
      <span className="shrink-0 font-mono text-[10px] text-muted">{time(message.createdAt)}</span>
    </div>
  );
}

function MessageRow({ message, head, side, stake, self }: { message: DisplayChatMessage; head: boolean; side?: EntrySide; stake?: number; self: boolean }) {
  const name = message.authorName ?? "Rival";
  const color = side ? SIDE_COLOR[side] : "var(--foreground)";
  if (!head)
    return (
      <div className="chat-row-enter group flex gap-3 rounded-md px-1 py-0.5 hover:bg-foreground/[0.03]">
        <span className="w-10 shrink-0 pt-0.5 text-right font-mono text-[9px] text-transparent group-hover:text-muted">{time(message.createdAt)}</span>
        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[15px] leading-snug text-foreground/90">{message.body}</p>
      </div>
    );
  return (
    <div className="chat-row-enter mt-2.5 flex gap-3 rounded-md px-1 py-1 hover:bg-foreground/[0.03]">
      {/* Face, and what they've got riding on it */}
      <div className="flex w-10 shrink-0 flex-col items-center">
        <RivalCharacter name={name} imageUrl={message.authorAvatarUrl} size={40} />
        {/* Tucked up against the face like a badge, so the row stays tight */}
        {side && typeof stake === "number" && (
          <span className="relative -mt-2 rounded-full px-1.5 py-px font-mono text-[10px] font-bold tabular-nums leading-tight ring-2 ring-surface" style={{ color, background: SIDE_DIM[side] }} title={`Backed ${side.toUpperCase()}`}>
            {formatMoneyCompact(stake)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[15px] font-bold" style={{ color }}>
            {name}
          </span>
          {self && <span className="text-[11px] text-muted">(you)</span>}
          {side && (
            <span className="rounded px-1 py-px font-mono text-[9px] font-bold" style={{ color, background: SIDE_DIM[side] }}>
              {side.toUpperCase()}
            </span>
          )}
          {!side && <span className="font-mono text-[10px] text-muted">watching</span>}
          <span className="font-mono text-[10px] text-muted">{time(message.createdAt)}</span>
        </p>
        <p className="whitespace-pre-wrap break-words text-[15px] leading-snug text-foreground/90">{message.body}</p>
      </div>
    </div>
  );
}
