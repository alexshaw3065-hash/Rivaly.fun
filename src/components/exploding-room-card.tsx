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
import { RoomChatPreview } from "./room-chat-preview";

// The page's one signature artifact (see anti-slop-design-law.md) — not
// just a bigger RoomCard. The self-colored top rule + momentum stat are
// what's actually new here: this is what makes a room worth showing on
// "Exploding Now" rather than just "Trending."
//
// Engagement-psychology mechanism #4 (collective effervescence / social
// facilitation — see .claude/skills/rivaly-engagement-psychology): the
// card's real gap wasn't data, it was people. A split % and a pool total
// describe a market; real chat is people reacting right now, and mere
// presence of others measurably raises engagement even before anyone
// interacts with them. RoomChatPreview cycles one real message at a time
// fast so the card reads as "packed" before anyone taps in — see room-
// chat-preview.tsx. Floats over the bottom edge of the split bar rather
// than living in the card's normal flow (per founder direction: it's
// secondary to the prediction/split-bar, not equal billing with them, and
// shouldn't push the rest of the card around or lengthen it) — a
// translucent scrim panel gives it just enough separation from the bar
// beneath it to stay legible. Only ever plays real messages from
// getRoomMessages(); most rooms don't have any yet in the mock dataset,
// and it just doesn't render rather than showing a placeholder.
export function ExplodingRoomCard({ room, match }: { room: Room; match: Match }) {
  const leftPct = splitPct(room);
  const momentum = momentumCount(room);
  const messages = getRoomMessages(room.id);
  const hasChatPreview = messages.some((m) => m.kind === "message" && m.userId);
  const countdown = kickoffCountdownLabel(match);

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border border-border-strong bg-surface-elevated p-5 transition-transform duration-150 ease-out active:scale-[0.98]"
    >
      <span className="block h-[3px] w-9 rounded-full" style={{ background: "var(--rival-blue)" }} />

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

      <div className="relative">
        <SplitBar leftPct={leftPct} leftLabel="Yes" rightLabel="No" />
        {hasChatPreview && (
          <div className="pointer-events-none absolute inset-x-0 top-full -mt-3">
            <RoomChatPreview roomId={room.id} messages={messages} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3.5 font-mono text-xs text-muted">
        <span>{formatMoney(room.poolTotalCents)} pool</span>
        <div className="flex items-center gap-3">
          <span className="text-rival-green">+{momentum} this hour</span>
          <BookmarkButton id={room.id} label="room" />
        </div>
      </div>
    </Link>
  );
}
