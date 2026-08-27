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
export function ExplodingRoomCard({ room, match }: { room: Room; match: Match }) {
  const leftPct = splitPct(room);
  const momentum = momentumCount(room);
  const messages = getRoomMessages(room.id);
  const countdown = kickoffCountdownLabel(match);

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="flex h-full flex-col gap-4 rounded-xl border border-border-strong bg-surface-elevated p-5 transition-transform duration-150 ease-out active:scale-[0.98]"
    >
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
