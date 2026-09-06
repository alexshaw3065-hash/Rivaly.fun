import Link from "next/link";
import type { Match, Room } from "@/lib/types";
import {
  formatMoney,
  splitPct,
  momentumCount,
  getRoomMessages,
  kickoffCountdownLabel,
} from "@/lib/mock-data";
import { SplitBar } from "./split-bar";
import { LiveBadge } from "./live-badge";
import { BookmarkButton } from "./bookmark-button";
import { ShareButton } from "./share-button";
import { RoomChatPreview } from "./room-chat-preview";
import { RivalsInRoom } from "./rivals-in-room";

// The page's one signature artifact (see anti-slop-design-law.md) — not
// just a bigger RoomCard. The self-colored top rule + momentum stat are
// what's actually new here: this is what makes a room worth showing on
// "Exploding Now" rather than just "Trending."
//
// Engagement-psychology mechanism #4 (collective effervescence / social
// facilitation — see .claude/skills/rivaly-engagement-psychology): the
// card's real gap wasn't data, it was people. RoomChatPreview sits in the
// card's normal flow, not overlaid on the split bar and not folded into
// the footer — both were tried; overlaying covered real information, and
// folding it into the footer's momentum stat lost the scroll motion that
// makes it read as "people are here right now." Only ever plays real
// messages from getRoomMessages(); most rooms don't have any yet in the
// mock dataset, and it just doesn't render rather than showing a
// placeholder.
//
// Bookmark + Share sit on the very top row, next to the self-colored
// signature rule, rather than crowding the competition/LIVE row below —
// so the footer's freed-up space could fit RivalsInRoom — an avatar
// stack + count in the same visual language as Home's OnlineRivalsBadge —
// without adding a new row or lengthening the card.
//
// A stadium-photo background was tried here and reverted — to stay
// legible it needed enough blur/scrim that it stopped reading as a real
// stadium and just became a colored gradient wash, which wasn't actually
// delivering any atmosphere in exchange for its real costs (one photo
// standing in for every match, file weight, licensing).
//
// This replaces that with an invented mark instead of a photo: an
// abstract floodlight silhouette, bled off the top-right corner at low
// opacity. It's line art (currentColor, no blur/glow filter), so it
// inverts correctly for free in light mode and costs nothing in file
// weight — no per-match photo problem, because it was never a photo of
// anything. Reserved for this card specifically: it's the page's one
// signature artifact, not a pattern to repeat on every room card.
function FloodlightMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 160"
      className="pointer-events-none absolute -right-5 -top-5 -z-10 h-32 w-32 text-foreground opacity-[0.07]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <line x1="40" y1="152" x2="40" y2="30" />
      <path d="M20 30 L60 30 L67 16 L13 16 Z" />
      <line x1="40" y1="23" x2="145" y2="55" />
      <line x1="40" y1="23" x2="154" y2="88" />
      <line x1="40" y1="23" x2="148" y2="121" />
      <line x1="40" y1="23" x2="122" y2="148" />
    </svg>
  );
}

export function ExplodingRoomCard({ room, match }: { room: Room; match: Match }) {
  const leftPct = splitPct(room);
  const momentum = momentumCount(room);
  const messages = getRoomMessages(room.id);
  const countdown = kickoffCountdownLabel(match);

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border border-border-strong bg-surface-elevated p-5 transition-transform duration-150 ease-out active:scale-[0.98]"
    >
      <FloodlightMark />

      <div className="flex items-center justify-between">
        <span className="block h-[3px] w-9 rounded-full" style={{ background: "var(--rival-blue)" }} />
        <div className="flex items-center gap-3">
          <ShareButton path={`/rooms/${room.id}`} label="room" />
          <BookmarkButton id={room.id} label="room" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {match.competition}
        </span>
        {match.status === "live" ? (
          <LiveBadge />
        ) : countdown ? (
          <span className="font-mono text-[11px] font-medium text-rival-blue">{countdown}</span>
        ) : (
          <span className="font-mono text-[11px] text-muted">
            {match.homeTeam.slice(0, 3).toUpperCase()} v {match.awayTeam.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>

      <p className="font-display text-xl font-semibold leading-snug text-foreground">
        {room.prediction}
      </p>

      <SplitBar leftPct={leftPct} leftLabel="Yes" rightLabel="No" />

      <RoomChatPreview roomId={room.id} messages={messages} />

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3.5 font-mono text-xs text-muted">
        <span className="shrink-0">{formatMoney(room.poolTotalCents)} pool</span>
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-rival-green">+{momentum}/hr</span>
          <RivalsInRoom roomId={room.id} participantCount={room.participantCount} />
        </div>
      </div>
    </Link>
  );
}
