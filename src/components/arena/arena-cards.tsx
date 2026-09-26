"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/mock-data";
import { TeamCrest } from "@/components/team-crest";
import { RivalCharacter } from "@/components/rival-character";
import { Photo } from "@/components/chat-thread";
import {
  ARENA_EMOJI,
  ago,
  isNfl,
  momentHeadline,
  decidedBy,
  opposite,
  sideShare,
  type ArenaAuthor,
  type ArenaEmoji,
  type ArenaItem,
  type ArenaMatch,
  type ArenaRoom,
  type EntryItem,
  type HotItem,
  type MomentItem,
  type MatchRoom,
  type MomentTone,
  type PostItem,
  type ReceiptItem,
  type SettledItem,
  type Side,
} from "@/lib/arena/model";
import { ArenaReplies } from "./arena-replies";

export interface CardActions {
  onReact: (item: ArenaItem, emoji: ArenaEmoji) => void;
  onTake: (moment: MomentItem) => void;
  onMatch: (matchId: string) => void;
  onDelete?: (item: PostItem) => void;
  /** False on a post's own page, where the replies are already open below. */
  inlineThread?: boolean;
  viewerId: string | null;
  names: Record<string, Record<number, string>>;
  /** Public rooms per match, for "decided by this goal" on moments. */
  rooms?: Record<string, MatchRoom[]>;
  onRooms?: (moment: MomentItem) => void;
}

const SIDE_COLOR: Record<Side, string> = { yes: "var(--rival-blue)", no: "var(--rival-red)" };
const TONE: Record<MomentTone, string> = { goal: "var(--rival-green)", card: "var(--rival-red)", var: "#f5a524", whistle: "var(--foreground)" };

export function ArenaCard({ item, actions }: { item: ArenaItem; actions: CardActions }) {
  switch (item.kind) {
    case "moment":
      return <MomentCard item={item} actions={actions} />;
    case "post":
      return <PostCard item={item} actions={actions} />;
    case "receipt":
      return <ReceiptCard item={item} actions={actions} />;
    case "entry":
      return <EntryCard item={item} actions={actions} />;
    case "settled":
      return <SettledCard item={item} />;
    case "hot":
      return <HotCard item={item} />;
  }
}

// ── Pieces ────────────────────────────────────────────────────────────

function Who({ author, at, extra }: { author: ArenaAuthor; at: string; extra?: React.ReactNode }) {
  const name = (
    <span className="truncate font-semibold text-foreground">{author.name}</span>
  );
  return (
    <div className="flex min-w-0 items-baseline gap-1.5 text-[14px]">
      {author.username ? (
        <Link href={`/profile/${author.username}`} className="min-w-0 truncate hover:underline">
          {name}
        </Link>
      ) : (
        name
      )}
      {author.username && <span className="hidden truncate text-muted sm:inline">@{author.username}</span>}
      <span className="shrink-0 text-muted">· {ago(at)}</span>
      {extra}
    </div>
  );
}

function Face({ author, size = 40 }: { author: ArenaAuthor; size?: number }) {
  const face = <RivalCharacter name={author.name} imageUrl={author.avatar} size={size} />;
  return author.username ? (
    <Link href={`/profile/${author.username}`} className="shrink-0" aria-label={author.name}>
      {face}
    </Link>
  ) : (
    <span className="shrink-0">{face}</span>
  );
}

function MatchTag({ match, onMatch }: { match: ArenaMatch; onMatch: (id: string) => void }) {
  const live = match.status === "live";
  return (
    <button
      type="button"
      onClick={() => onMatch(match.id)}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-[12px] text-muted ring-1 ring-border transition-colors hover:text-foreground"
    >
      <TeamCrest name={match.home} size={16} />
      <span className="truncate">
        {match.home} v {match.away}
      </span>
      {live && <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-rival-green">Live</span>}
    </button>
  );
}

function Reactions({ item, onReact }: { item: ArenaItem; onReact: CardActions["onReact"] }) {
  const [open, setOpen] = useState(false);
  const shown = ARENA_EMOJI.filter((e) => (item.reactions[e] ?? 0) > 0);
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
      {shown.map((e) => {
        const mine = item.mine.includes(e);
        return (
          <button
            key={e}
            type="button"
            onClick={() => onReact(item, e)}
            aria-pressed={mine}
            className="flex h-7 items-center gap-1 rounded-full px-2 text-[13px] ring-1 transition-colors duration-150"
            style={{
              background: mine ? "color-mix(in srgb, var(--rival-blue) 16%, transparent)" : "transparent",
              color: mine ? "var(--foreground)" : "var(--muted)",
              borderColor: "transparent",
              boxShadow: `inset 0 0 0 1px ${mine ? "var(--rival-blue)" : "var(--border)"}`,
            }}
          >
            <span>{e}</span>
            <span className="font-mono text-[12px] tabular-nums">{item.reactions[e]}</span>
          </button>
        );
      })}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="React"
          aria-expanded={open}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:text-foreground"
        >
          <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden>
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
            <circle cx="7.4" cy="8.4" r="1" fill="currentColor" />
            <circle cx="12.6" cy="8.4" r="1" fill="currentColor" />
            <path d="M6.8 12c.8 1.2 1.9 1.8 3.2 1.8s2.4-.6 3.2-1.8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </svg>
        </button>
        {open && (
          <div className="absolute bottom-9 left-0 z-10 flex gap-0.5 rounded-full bg-surface-elevated p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] ring-1 ring-border [animation:fade-in-up_140ms_ease-out_both]">
            {ARENA_EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onReact(item, e);
                  setOpen(false);
                }}
                aria-label={`React ${e}`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform duration-150 hover:bg-foreground/10 active:scale-90"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The room a post points at. A call or an entry has a side (the author staked
 * it), so the challenge is "Fade it"; a quote has no side, so it's an open
 * door — join either end.
 */
function CallSlip({ room, side, amount, authorId, viewerId }: { room: ArenaRoom; side: Side | null; amount?: number; authorId: string; viewerId: string | null }) {
  const yesShare = sideShare(room, "yes");
  const open = room.status === "open";
  const own = viewerId === authorId;
  return (
    <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-border">
      <Link href={`/rooms/${room.id}`} className="block px-3.5 pb-3 pt-3 transition-colors hover:bg-foreground/[0.03]">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
          {side ? <span style={{ color: SIDE_COLOR[side] }}>Backing {side}</span> : <span className="text-muted">Room</span>}
          {amount !== undefined && <span className="font-mono text-muted">{formatMoney(amount)}</span>}
          <span className="ml-auto font-mono font-medium normal-case tracking-normal text-muted">{formatMoney(room.pool)} pot · {room.participants}</span>
        </div>
        <p className="mt-1.5 text-[15px] font-semibold leading-snug text-foreground">{room.prediction}</p>
        <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
          <span style={{ width: `${yesShare * 100}%`, background: SIDE_COLOR.yes }} />
          <span style={{ width: `${(1 - yesShare) * 100}%`, background: SIDE_COLOR.no }} />
        </div>
      </Link>
      {open && side && !own && (
        <div className="grid grid-cols-2 border-t border-border">
          <Link
            href={`/rooms/${room.id}?side=${opposite(side)}`}
            className="flex h-11 items-center justify-center gap-1.5 text-[14px] font-bold transition-colors hover:bg-foreground/[0.04]"
            style={{ color: SIDE_COLOR[opposite(side)] }}
          >
            Fade it
            <span className="font-mono text-[11px] font-semibold uppercase opacity-80">· {opposite(side)}</span>
          </Link>
          <Link
            href={`/rooms/${room.id}?side=${side}`}
            className="flex h-11 items-center justify-center gap-1.5 border-l border-border text-[14px] font-semibold text-foreground transition-colors hover:bg-foreground/[0.04]"
          >
            Back it
          </Link>
        </div>
      )}
      {open && !side && (
        <div className="grid grid-cols-2 border-t border-border">
          {(["yes", "no"] as const).map((s, i) => (
            <Link
              key={s}
              href={`/rooms/${room.id}?side=${s}`}
              className={`flex h-11 items-center justify-center gap-1.5 text-[14px] font-bold transition-colors hover:bg-foreground/[0.04] ${i ? "border-l border-border" : ""}`}
              style={{ color: SIDE_COLOR[s] }}
            >
              Join {s.toUpperCase()}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ face, children }: { face: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="flex gap-3 px-4 py-3.5">
      {face}
      <div className="min-w-0 flex-1">{children}</div>
    </article>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────

function PostCard({ item, actions }: { item: PostItem; actions: CardActions }) {
  const [thread, setThread] = useState(false);
  const [replies, setReplies] = useState(item.replies);
  const own = actions.viewerId === item.author.id;
  return (
    <Row face={<Face author={item.author} />}>
      <Who
        author={item.author}
        at={item.at}
        extra={
          own && actions.onDelete ? (
            <button type="button" onClick={() => actions.onDelete?.(item)} className="ml-auto shrink-0 text-[12px] text-muted hover:text-rival-red">
              Delete
            </button>
          ) : null
        }
      />
      {item.body && <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-[1.45] text-foreground/90">{item.body}</p>}
      {item.attachment && (
        <div className="mt-2">
          <Photo attachment={item.attachment} />
        </div>
      )}
      {item.room && <CallSlip room={item.room} side={item.side} authorId={item.author.id} viewerId={actions.viewerId} />}
      {item.match && !item.room && (
        <div className="mt-2">
          <MatchTag match={item.match} onMatch={actions.onMatch} />
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-3">
        <Reactions item={item} onReact={actions.onReact} />
        {actions.inlineThread !== false && (
        <button
          type="button"
          onClick={() => setThread((t) => !t)}
          className="flex h-7 shrink-0 items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-foreground"
          aria-expanded={thread}
        >
          <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden>
            <path d="M3.5 5.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.5 3v-3h0a2 2 0 0 1-2-2v-6Z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
          </svg>
          {replies > 0 ? replies : "Reply"}
        </button>
        )}
        <Link href={`/arena/p/${item.id}`} aria-label="Open post" className="flex h-7 shrink-0 items-center text-muted hover:text-foreground">
          <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden>
            <path d="M8 4H5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 5 16h9a1.5 1.5 0 0 0 1.5-1.5v-3M11 3.5h5.5V9M16.5 3.5 9 11" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
      {thread && <ArenaReplies postId={item.id} onCount={setReplies} />}
    </Row>
  );
}

function ReceiptCard({ item, actions }: { item: ReceiptItem; actions: CardActions }) {
  const score = item.match && item.match.homeScore !== null ? `${item.match.home} ${item.match.homeScore}–${item.match.awayScore} ${item.match.away}` : null;
  return (
    <Row face={<Face author={item.author} />}>
      <div className="flex items-center gap-2">
        <span
          className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest"
          style={{ background: item.won ? "var(--rival-green-dim)" : "var(--surface-elevated)", color: item.won ? "var(--rival-green)" : "var(--muted)" }}
        >
          {item.won ? "Receipt · called it" : "Receipt · missed"}
        </span>
        <span className="text-[12px] text-muted">called {ago(item.calledAt)} ago</span>
      </div>
      <Who author={item.author} at={item.at} />
      <blockquote className="mt-1.5 border-l-2 pl-3 text-[15px] leading-[1.45] text-foreground/90" style={{ borderColor: SIDE_COLOR[item.side] }}>
        {item.body || item.room.prediction}
      </blockquote>
      <div className="mt-2.5 rounded-xl px-3.5 py-3 ring-1 ring-border">
        <p className="text-[13px] font-semibold text-foreground">{item.room.prediction}</p>
        <p className="mt-0.5 text-[13px] text-muted">
          <span className="font-bold uppercase" style={{ color: SIDE_COLOR[(item.room.outcome as Side) ?? "yes"] }}>
            {item.room.outcome}
          </span>{" "}
          won{score ? ` · ${score}` : ""} · {formatMoney(item.room.pool)} pot
        </p>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <Reactions item={item} onReact={actions.onReact} />
        {!item.won && item.rematchMatchId && (
          <Link href={`/rooms/create?matchId=${item.rematchMatchId}`} className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold text-white" style={{ background: "var(--rival-blue)" }}>
            Rematch
          </Link>
        )}
        <ShareLink id={item.id} className="shrink-0" />
      </div>
    </Row>
  );
}

function ShareLink({ id, className = "" }: { id: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}/arena/p/${id}`;
    try {
      if (navigator.share) await navigator.share({ url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  }
  return (
    <button type="button" onClick={share} className={`flex h-7 items-center gap-1 text-[13px] text-muted hover:text-foreground ${className}`}>
      <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden>
        <path d="M10 3v10M6 7l4-4 4 4M4 12v3.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V12" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {copied ? "Copied" : "Share"}
    </button>
  );
}

function EntryCard({ item, actions }: { item: EntryItem; actions: CardActions }) {
  return (
    <Row face={<Face author={item.author} />}>
      <Who author={item.author} at={item.at} />
      <p className="mt-0.5 text-[15px] text-foreground/90">
        backed <span className="font-bold uppercase" style={{ color: SIDE_COLOR[item.side] }}>{item.side}</span> with {formatMoney(item.amount)}
      </p>
      <CallSlip room={item.room} side={item.side} amount={item.amount} authorId={item.author.id} viewerId={actions.viewerId} />
      <div className="mt-2.5">
        <Reactions item={item} onReact={actions.onReact} />
      </div>
    </Row>
  );
}

function SettledCard({ item }: { item: SettledItem }) {
  const outcome = (item.room.outcome as Side) ?? "yes";
  const shown = item.winners.slice(0, 3);
  return (
    <Link href={`/rooms/${item.room.id}`} className="block px-4 py-3.5 transition-colors hover:bg-foreground/[0.02]">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted">Room settled · {ago(item.at)}</p>
      <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">{item.room.prediction}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="shrink-0 whitespace-nowrap font-bold uppercase" style={{ color: SIDE_COLOR[outcome] }}>
          {outcome} won
        </span>
        <span className="text-muted">·</span>
        <span className="flex shrink-0 -space-x-1.5">
          {shown.map((w) => (
            <span key={w.author.id} className="rounded-full ring-2 ring-surface">
              <RivalCharacter name={w.author.name} imageUrl={w.author.avatar} size={20} />
            </span>
          ))}
        </span>
        <span className="min-w-0 truncate text-[13px] text-muted">
          {item.winners.length === 0 ? "no winners" : `${shown.map((w) => w.author.name).join(", ")}${item.winners.length > 3 ? ` +${item.winners.length - 3}` : ""} split ${formatMoney(item.room.pool)}`}
        </span>
      </div>
    </Link>
  );
}

function HotCard({ item }: { item: HotItem }) {
  return (
    <Link href={`/rooms/${item.room.id}`} className="block px-4 py-3.5 transition-colors hover:bg-foreground/[0.02]">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-rival-blue">Heating up</span>
        <span className="text-[12px] text-muted">{item.recent} joined in the last 30 min</span>
      </div>
      <p className="mt-1 text-[15px] font-semibold leading-snug text-foreground">{item.room.prediction}</p>
      <p className="mt-1 font-mono text-[12px] text-muted">
        {formatMoney(item.room.pool)} pot · {item.room.participants} in
      </p>
    </Link>
  );
}

// The loud one. Only real match events reach here (goals, reds, VAR,
// penalties, full time, touchdowns, field goals) — so it's allowed to be big.
function MomentCard({ item, actions }: { item: MomentItem; actions: CardActions }) {
  const { title, tone, detail } = momentHeadline(item, actions.names[item.match.id]);
  const decided = decidedBy(item, actions.rooms?.[item.match.id] ?? []);
  const color = TONE[tone];
  const p = item.payload;
  const hasScore = p.home !== undefined && p.away !== undefined;
  const scorer = item.action === "game_finalised" ? null : p.side ?? null;
  const nfl = isNfl(item.match);
  const minute = !nfl && item.minute ? `${item.minute}'` : null;
  return (
    <article className="relative px-4 pb-3.5 pt-3.5" style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${color} 9%, transparent), transparent 70%)` }}>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }} aria-hidden />
      <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted">
        <span className="truncate">{item.match.competition}</span>
        {minute && <span>· {minute}</span>}
        <span className="ml-auto font-medium normal-case tracking-normal">{ago(item.at)}</span>
      </div>
      <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide name={item.match.home} lit={scorer === "home"} align="right" />
        <div className="flex items-baseline gap-1.5 font-display text-[40px] font-black leading-none tabular-nums tracking-tight">
          {hasScore ? (
            <>
              <span style={{ color: scorer === "home" ? color : "var(--foreground)" }}>{p.home}</span>
              <span className="text-[22px] text-muted">–</span>
              <span style={{ color: scorer === "away" ? color : "var(--foreground)" }}>{p.away}</span>
            </>
          ) : (
            <span className="text-[22px] text-muted">v</span>
          )}
        </div>
        <TeamSide name={item.match.away} lit={scorer === "away"} align="left" />
      </div>
      <div className="mt-3 text-center">
        <p className="font-display text-[19px] font-extrabold uppercase tracking-wide" style={{ color }}>
          {title}
        </p>
        {detail && <p className="mt-0.5 text-[13px] text-muted">{detail}</p>}
        {decided.length > 0 && (
          <button type="button" onClick={() => actions.onRooms?.(item)} className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ring-1" style={{ color, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)` }}>
            {item.action === "game_finalised" ? "Settles" : "Decided"} {decided.length} {decided.length === 1 ? "room" : "rooms"}
            <span className="font-mono text-[11px] text-muted">
              {(["yes", "no"] as const).map((o) => {
                const n = decided.filter((d) => d.outcome === o).length;
                return n ? `${o.toUpperCase()} ${n}` : null;
              }).filter(Boolean).join(" · ")}
            </span>
          </button>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Reactions item={item} onReact={actions.onReact} />
        {item.rooms > 0 && (
          <button type="button" onClick={() => (actions.onRooms ? actions.onRooms(item) : actions.onMatch(item.match.id))} className="shrink-0 whitespace-nowrap text-[13px] text-muted underline-offset-2 hover:text-foreground hover:underline">
            {item.rooms} {item.rooms === 1 ? "room" : "rooms"}
          </button>
        )}
        <button
          type="button"
          onClick={() => actions.onTake(item)}
          className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--border-strong)] transition-colors hover:bg-foreground/5"
        >
          {item.takes > 0 ? `Take · ${item.takes}` : "Add a take"}
        </button>
      </div>
    </article>
  );
}

function TeamSide({ name, lit }: { name: string; lit: boolean; align?: "left" | "right" }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <TeamCrest name={name} size={34} />
      <span className="line-clamp-2 text-[12px] font-semibold leading-tight" style={{ color: lit ? "var(--foreground)" : "var(--muted)" }}>
        {name}
      </span>
    </div>
  );
}
