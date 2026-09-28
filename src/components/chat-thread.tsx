"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ReportReasons } from "./report-reasons";
import type { ReportReason } from "@/lib/report";
import { Drawer } from "vaul";
import { REACTION_EMOJI, type ChatAttachment, type DisplayChatMessage } from "@/lib/supabase/message-mapper";
import { chatPhotoUrl } from "@/lib/cloudinary";
import { KLIPY_MEDIA } from "@/lib/klipy";
import { decodeMoment, type EventTone } from "@/lib/match-event-label";
import { formatMoneyCompact } from "@/lib/mock-data";
import type { EntrySide } from "@/lib/types";
import { RivalCharacter } from "./rival-character";
import { haptic } from "@/lib/haptics";

// The room's chat as a full thread, the way Discord lays one out: a person's
// first message in a run carries their face, name (in the colour of the side
// they backed) and time — with their stake tucked under the face, so you
// see who's talking and what they've got riding on it. Follow-ups within a
// few minutes stack beneath. Replies hang off a curved line to a one-line
// quote of what they answer (tap it to jump there). Reactions sit under the
// message as pills. Hover a message (desktop) for quick reactions and Reply;
// on a phone, press and hold it. Match moments are system lines; days get a
// divider. It sticks to the newest message unless you've scrolled up to
// read — then new ones wait behind the "new messages" bar.
//
// Engagement mechanisms #4 (collective effervescence — a live, synchronous
// crowd) and #5 (social identity — every line wears its side and stake).

export type ReactionMap = Record<string, Record<string, string[]>>;

const GROUP_MS = 5 * 60_000;
const NEAR_BOTTOM_PX = 80;
const HOLD_MS = 420;
const QUICK_REACT = ["🔥", "😂", "😭"] as const;
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

/** One line for quotes and the action sheet: the text, or what it carries. */
const summary = (m: DisplayChatMessage) => m.body || (m.attachment?.type === "gif" ? "GIF" : m.attachment ? "📷 Photo" : "");

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
    // A reply always opens with its own header, like Discord.
    const head = !prev || prev.userId !== m.userId || !!m.replyTo || +d - +new Date(prev.createdAt) > GROUP_MS;
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
  reactions = {},
  onReact,
  onReply,
  onReport,
}: {
  items: DisplayChatMessage[];
  sides: Record<string, EntrySide>;
  stakes: Record<string, number>;
  selfId?: string;
  empty: ReactNode;
  onLoadEarlier?: () => Promise<void>;
  hasEarlier?: boolean;
  reactions?: ReactionMap;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: DisplayChatMessage) => void;
  /** Report someone else's message; it's gone for you at once. */
  onReport?: (message: DisplayChatMessage, reason: ReportReason) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const [unseen, setUnseen] = useState(0);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [sheetFor, setSheetForRaw] = useState<DisplayChatMessage | null>(null);
  const [reporting, setReporting] = useState(false);
  const setSheetFor = (m: DisplayChatMessage | null) => {
    setSheetForRaw(m);
    setReporting(false);
  };
  const [flash, setFlash] = useState<string | null>(null);
  const lastCount = useRef(items.length);
  const lastNewest = useRef(items[items.length - 1]?.id);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(t);
  }, []);
  const rows = buildRows(items, now ?? new Date(items[items.length - 1]?.createdAt ?? 0));
  const byId = new Map(items.map((m) => [m.id, m]));

  // Open at the newest message.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // New at the bottom: follow if you're there (or it's yours), otherwise count it.
  useLayoutEffect(() => {
    const el = scroller.current;
    const newest = items[items.length - 1]?.id;
    const grew = items.length > lastCount.current;
    const appended = newest !== lastNewest.current;
    lastCount.current = items.length;
    lastNewest.current = newest;
    if (!el || !grew || !appended) return;
    const mine = items[items.length - 1]?.userId === selfId;
    if (atBottom.current || mine) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    else setUnseen((n) => n + 1);
  }, [items, selfId]);

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

  const goTo = (id: string) => {
    const target = scroller.current?.querySelector(`[data-mid="${id}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlash(id);
    window.setTimeout(() => setFlash((f) => (f === id ? null : f)), 1400);
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
      {/* New messages while you were reading back — Discord's blurple bar */}
      {unseen > 0 && (
        <button
          type="button"
          onClick={jump}
          className="absolute inset-x-2 top-2 z-10 flex h-8 items-center justify-between rounded-control bg-yes px-3 text-label font-semibold text-white shadow-pop [animation:fade-in-up_280ms_cubic-bezier(0.23,1,0.32,1)_both]"
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

      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-1">
        {hasEarlier && (
          <div className="flex justify-center py-2">
            <button type="button" onClick={loadEarlier} disabled={loadingEarlier} className="rounded-full px-3 py-1 text-caption font-semibold text-secondary edge-strong transition-colors hover:text-foreground disabled:opacity-60">
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
                selfId={selfId}
                quoted={r.message.replyTo ? byId.get(r.message.replyTo) : undefined}
                quotedSide={r.message.replyTo ? sides[byId.get(r.message.replyTo)?.userId ?? ""] : undefined}
                reactions={reactions[r.message.id]}
                flashing={flash === r.message.id}
                onReact={onReact}
                onReply={onReply}
                onOpenSheet={() => setSheetFor(r.message)}
                onJumpToQuoted={goTo}
              />
            ),
          )
        )}
      </div>

      {/* Press-and-hold on a phone: react, reply, copy */}
      <Drawer.Root open={sheetFor !== null} onOpenChange={(o) => !o && setSheetFor(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-scrim" />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-sheet bg-background px-4 pb-[max(env(safe-area-inset-bottom),16px)] shadow-sheet outline-none"
          >
            <Drawer.Handle className="!mx-auto !mt-2 !mb-3 !h-1 !w-9 !rounded-full !bg-line-strong" />
            <Drawer.Title className="sr-only">{reporting ? "Report message" : "Message actions"}</Drawer.Title>
            {sheetFor && reporting && (
              <>
                <p className="mb-3 text-center text-title-3 font-display text-foreground">Report message</p>
                <ReportReasons
                  onPick={(reason) => {
                    onReport?.(sheetFor, reason);
                    setSheetFor(null);
                  }}
                />
              </>
            )}
            {sheetFor && !reporting && (
              <>
                <p className="mb-3 line-clamp-2 rounded-control bg-surface px-3 py-2 text-label text-foreground/80">
                  <span className="font-semibold text-foreground">{sheetFor.authorName}</span> {summary(sheetFor)}
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {REACTION_EMOJI.map((e) => {
                    const mine = !!selfId && (reactions[sheetFor.id]?.[e] ?? []).includes(selfId);
                    return (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          onReact?.(sheetFor.id, e);
                          setSheetFor(null);
                        }}
                        className="flex h-12 items-center justify-center rounded-control text-2xl transition-transform duration-100 active:scale-90"
                        style={{ background: mine ? "color-mix(in srgb, var(--rival-blue) 22%, var(--surface))" : "var(--surface)" }}
                      >
                        {e}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-col overflow-hidden rounded-card bg-surface edge">
                  <SheetAction
                    label="Reply"
                    icon={<ReplyIcon />}
                    onClick={() => {
                      onReply?.(sheetFor);
                      setSheetFor(null);
                    }}
                  />
                  {sheetFor.body && (
                  <SheetAction
                    label="Copy text"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                        <rect x="5" y="5" width="8.5" height="8.5" rx="1.8" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <path d="M3 10.5V3.8C3 3.4 3.4 3 3.8 3h6.7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    }
                    onClick={() => {
                      void navigator.clipboard?.writeText(sheetFor.body);
                      setSheetFor(null);
                    }}
                  />
                  )}
                  {onReport && selfId && sheetFor.userId && sheetFor.userId !== selfId && (
                    <SheetAction
                      label="Report"
                      icon={
                        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                          <path d="M3.5 14V2.8M3.5 3h8l-1.6 3 1.6 3h-8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      }
                      onClick={() => setReporting(true)}
                    />
                  )}
                </div>
              </>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

function SheetAction({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="press-row flex h-12 items-center gap-3 border-b border-line px-4 text-left text-body font-semibold text-foreground last:border-0">
      <span className="text-secondary">{icon}</span>
      {label}
    </button>
  );
}

function ReplyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M6.5 3.5 2.5 7.5l4 4M2.8 7.5h6.7c2.3 0 4 1.7 4 4v1" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="my-3 flex items-center gap-2 px-1" role="separator">
      <span className="h-px flex-1 bg-line" />
      <span className="text-micro uppercase text-tertiary">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function SystemLine({ message }: { message: DisplayChatMessage }) {
  const moment = decodeMoment(message.body);
  const tone = TONE[moment.tone];
  // Most moment labels lead with their own emoji ("⚽ GOAL 63'") — use it
  // as the line's icon rather than showing it twice.
  const lead = moment.label.match(/^(\p{Extended_Pictographic}️?)\s*/u);
  const icon = lead ? lead[1] : tone.icon;
  const label = lead ? moment.label.slice(lead[0].length) : moment.label;
  const big = moment.tone === "goal" || moment.tone.startsWith("takeover");
  return (
    <div
      className={`chat-row-enter my-1 flex items-center gap-3 rounded-control px-2 ${big ? "py-3" : "py-1"}`}
      style={big ? { background: `color-mix(in srgb, ${tone.color} 12%, transparent)` } : undefined}
    >
      <span className="flex w-10 shrink-0 justify-center text-label" style={{ color: tone.color }} aria-hidden>
        {icon}
      </span>
      <span className={`min-w-0 flex-1 text-label ${big ? "font-bold" : "font-medium"}`} style={{ color: big ? tone.color : "var(--foreground)" }}>
        {label}
      </span>
      <span className="shrink-0 text-caption tabular-nums text-tertiary">{time(message.createdAt)}</span>
    </div>
  );
}

function MessageRow({
  message,
  head,
  side,
  stake,
  self,
  selfId,
  quoted,
  quotedSide,
  reactions,
  flashing,
  onReact,
  onReply,
  onOpenSheet,
  onJumpToQuoted,
}: {
  message: DisplayChatMessage;
  head: boolean;
  side?: EntrySide;
  stake?: number;
  self: boolean;
  selfId?: string;
  quoted?: DisplayChatMessage;
  quotedSide?: EntrySide;
  reactions?: Record<string, string[]>;
  flashing: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onReply?: (message: DisplayChatMessage) => void;
  onOpenSheet: () => void;
  onJumpToQuoted: (id: string) => void;
}) {
  const name = message.authorName ?? "Rival";
  const color = side ? SIDE_COLOR[side] : "var(--foreground)";
  const hold = useRef<number | undefined>(undefined);
  const startHold = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    hold.current = window.setTimeout(() => {
      haptic("tick");
      onOpenSheet();
    }, HOLD_MS);
  };
  const endHold = () => window.clearTimeout(hold.current);

  const reactionList = Object.entries(reactions ?? {}).filter(([, users]) => users.length > 0);

  const body = (
    <>
      {message.attachment && <Photo attachment={message.attachment} />}
      {message.body && <p className="whitespace-pre-wrap break-words text-body text-foreground/90">{message.body}</p>}
      {reactionList.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {reactionList.map(([emoji, users]) => {
            const mine = !!selfId && users.includes(selfId);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact?.(message.id, emoji)}
                className={`enter-pop flex h-6 items-center gap-1 rounded-tag px-1.5 text-label outline outline-1 -outline-offset-1 transition-transform duration-100 active:scale-90 ${
                  mine ? "bg-yes-tint outline-yes" : "bg-overlay-1 outline-transparent"
                }`}
                aria-label={`${emoji} ${users.length}${mine ? ", you reacted" : ""}`}
              >
                <span>{emoji}</span>
                <span className={`text-caption font-semibold tabular-nums ${mine ? "text-yes-ink" : "text-secondary"}`}>
                  {users.length}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div
      data-mid={message.id}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      onPointerCancel={endHold}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenSheet();
      }}
      className={`chat-row-enter group relative rounded-md px-1 transition-colors duration-300 hover:bg-foreground/[0.03] ${head ? "mt-2.5 py-1" : "py-0.5"}`}
      style={flashing ? { background: "var(--yes-tint)" } : undefined}
    >
      {/* Desktop: quick reactions and Reply on hover */}
      <div className="pointer-events-none absolute -top-3 right-2 z-10 hidden items-center gap-0.5 rounded-control bg-surface-elevated p-0.5 opacity-0 shadow-pop transition-opacity duration-100 group-hover:pointer-events-auto group-hover:opacity-100 md:flex">
        {QUICK_REACT.map((e) => (
          <button key={e} type="button" onClick={() => onReact?.(message.id, e)} className="flex h-7 w-7 items-center justify-center rounded-md text-sm hover:bg-foreground/10" aria-label={`React ${e}`}>
            {e}
          </button>
        ))}
        <button type="button" onClick={onOpenSheet} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-foreground/10 hover:text-foreground" aria-label="More reactions">
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" fill="none" />
            <circle cx="6" cy="6.8" r="0.9" fill="currentColor" />
            <circle cx="10" cy="6.8" r="0.9" fill="currentColor" />
            <path d="M5.6 9.8c.6.9 1.4 1.3 2.4 1.3s1.8-.4 2.4-1.3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" onClick={() => onReply?.(message)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-foreground/10 hover:text-foreground" aria-label="Reply">
          <ReplyIcon />
        </button>
      </div>

      {head ? (
        <>
          {/* Reply: a curved line from the face up to a one-line quote */}
          {message.replyTo && (
            <div className="relative mb-0.5 flex items-center gap-1.5 pl-[52px]">
              <span aria-hidden className="absolute left-[19px] top-[9px] h-[10px] w-[29px] rounded-tl-md border-l-2 border-t-2 border-border-strong" />
              {quoted ? (
                <button type="button" onClick={() => onJumpToQuoted(quoted.id)} className="flex min-w-0 items-center gap-1.5 text-left">
                  <RivalCharacter name={quoted.authorName ?? "Rival"} imageUrl={quoted.authorAvatarUrl} size={16} />
                  <span className="shrink-0 text-label font-semibold" style={{ color: quotedSide ? SIDE_COLOR[quotedSide] : "var(--foreground)" }}>
                    @{quoted.authorName ?? "Rival"}
                  </span>
                  <span className="truncate text-label text-secondary">{summary(quoted)}</span>
                </button>
              ) : (
                <span className="text-label italic text-secondary">Original message not loaded</span>
              )}
            </div>
          )}
          <div className="flex gap-3">
            {/* Face, and what they've got riding on it */}
            <div className="flex w-10 shrink-0 flex-col items-center">
              <RivalCharacter name={name} imageUrl={message.authorAvatarUrl} size={40} />
              {side && typeof stake === "number" && (
                <span
                  className="relative -mt-2 rounded-full px-1.5 py-px text-micro font-bold tabular-nums leading-tight ring-2 ring-surface"
                  style={{ color, background: SIDE_DIM[side] }}
                  title={`Backed ${side.toUpperCase()}`}
                >
                  {formatMoneyCompact(stake)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-1.5 leading-tight">
                <span className="text-body font-bold" style={{ color }}>
                  {self ? "You" : name}
                </span>
                {side ? (
                  <span className={`rounded-tag px-1 py-px text-micro font-bold leading-tight text-white ${side === "yes" ? "bg-yes" : "bg-no"}`}>
                    {side.toUpperCase()}
                  </span>
                ) : (
                  <span className="rounded-tag px-1 py-px text-micro font-bold leading-tight text-tertiary edge-strong">WATCHING</span>
                )}
                <span className="text-caption tabular-nums text-tertiary">{time(message.createdAt)}</span>
              </p>
              <div className="mt-0.5">{body}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex gap-3">
          <span className="w-10 shrink-0 pt-1 text-right text-micro tabular-nums text-transparent group-hover:text-tertiary">{time(message.createdAt)}</span>
          <div className="min-w-0 flex-1">{body}</div>
        </div>
      )}
    </div>
  );
}

// A photo in the thread: its exact shape reserved up front (no jump), the
// blurred preview underneath until the real image lands, the sender's upload
// ring while it's on its way, and full screen on tap.
const PHOTO_BOX = { w: 260, h: 320 };

export function Photo({ attachment: a }: { attachment: ChatAttachment }) {
  if (a.type === "gif") return <Gif attachment={a} />;
  return <Still attachment={a} />;
}

// Only inline previews render — never a link that calls out to another server.
const safeLqip = (lqip: string | undefined) => (lqip && /^data:image\/(jpeg|webp|png);base64,/.test(lqip) ? lqip : undefined);

function boxFor(a: ChatAttachment) {
  const scale = Math.min(PHOTO_BOX.w / a.w, PHOTO_BOX.h / a.h, 1);
  return { w: Math.max(120, Math.round(a.w * scale)), h: Math.max(80, Math.round(a.h * scale)) };
}

// A GIF is a small looping video straight from Klipy — a fraction of a real
// GIF's size — and only plays while it's on screen.
function Gif({ attachment: a }: { attachment: ChatAttachment }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { w, h } = boxFor(a);
  const src = a.url && KLIPY_MEDIA.test(a.url) ? a.url : null;
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => (e?.isIntersecting ? void v.play().catch(() => {}) : v.pause()), { threshold: 0.2 });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);
  return (
    <span className="relative mb-1 mt-0.5 block overflow-hidden rounded-card bg-overlay-1" style={{ width: w, height: h, maxWidth: "100%" }}>
      {safeLqip(a.lqip) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={safeLqip(a.lqip)} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      )}
      {src && <video ref={ref} src={src} muted loop playsInline preload="metadata" aria-label="GIF" className="absolute inset-0 h-full w-full object-cover" />}
    </span>
  );
}

function Still({ attachment: a }: { attachment: ChatAttachment }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { w, h } = boxFor(a);
  const src = a.expired ? null : (a.local ?? (a.ref ? chatPhotoUrl(a.ref, w * 2) : null));
  const uploading = a.local !== undefined && (a.progress ?? 0) < 1;

  return (
    <>
      <button
        type="button"
        onClick={() => a.ref && !a.expired && setOpen(true)}
        className="relative mb-1 mt-0.5 block overflow-hidden rounded-card bg-overlay-1 edge"
        style={{ width: w, height: h, maxWidth: "100%" }}
        aria-label={a.expired ? "Photo expired" : "Open photo"}
      >
        {safeLqip(a.lqip) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={safeLqip(a.lqip)} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-md" />
        )}
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Photo"
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
            style={{ opacity: loaded ? 1 : 0 }}
          />
        )}
        {a.expired && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-label font-semibold text-white">Photo expired</span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <ProgressRing value={a.progress ?? 0} />
          </span>
        )}
      </button>
      {open && a.ref && <PhotoViewer src={chatPhotoUrl(a.ref, 1600)} onClose={() => setOpen(false)} />}
    </>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-label={`Uploading ${Math.round(value * 100)}%`}>
      <circle cx="20" cy="20" r={r} stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="rgba(0,0,0,0.35)" />
      <circle
        cx="20"
        cy="20"
        r={r}
        stroke="#fff"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c * Math.max(0.04, value)} ${c}`}
        transform="rotate(-90 20 20)"
        style={{ transition: "stroke-dasharray 200ms ease-out" }}
      />
    </svg>
  );
}

// Full screen: the photo at full size, tap anywhere (or Escape) to close,
// pinch to zoom (the browser's own), and Save.
function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-label="Photo" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 [animation:fade-in-up_200ms_ease-out_both]" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Photo" className="max-h-[88dvh] max-w-[96vw] touch-pinch-zoom object-contain" />
      <div className="absolute inset-x-0 top-0 flex justify-between p-4 pt-[max(env(safe-area-inset-top),16px)]">
        <a
          href={src.replace("/upload/", "/upload/fl_attachment/")}
          onClick={(e) => e.stopPropagation()}
          className="rounded-full bg-white/15 px-4 py-2 text-label font-semibold text-white backdrop-blur-sm"
        >
          Save
        </a>
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
