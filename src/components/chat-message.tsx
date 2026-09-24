import type { DisplayChatMessage } from "@/lib/supabase/message-mapper";
import { decodeMoment } from "@/lib/match-event-label";
import type { EntrySide } from "@/lib/types";
import { RivalCharacter } from "./rival-character";

const SIDE_COLOR: Record<EntrySide, string> = { yes: "var(--rival-blue)", no: "var(--rival-red)" };

const TONE: Record<string, { color: string; weight: string }> = {
  goal: { color: "var(--rival-green)", weight: "font-bold" },
  card: { color: "#f5c542", weight: "font-semibold" },
  var: { color: "#14b8c4", weight: "font-semibold" },
  whistle: { color: "var(--muted)", weight: "font-medium" },
  "takeover-yes": { color: "var(--rival-blue)", weight: "font-bold" },
  "takeover-no": { color: "var(--rival-red)", weight: "font-bold" },
};

// Inert content only — entrance/exit motion belongs to the wrapping
// ChatFeedRows slot (see chat-feed-rows.tsx), not this row itself.
//
// A person's name wears the colour of the side they backed (spectators stay
// neutral), with a small YES/NO tag — so rivals recognise each other across
// the feed. Match moments are centred pills in their own tone: goals green,
// cards amber, VAR teal, whistles quiet.
export function ChatMessageRow({ message, side, isSelf = false }: { message: DisplayChatMessage; side?: EntrySide; isSelf?: boolean }) {
  if (message.kind === "system") {
    const moment = decodeMoment(message.body);
    const tone = TONE[moment.tone];
    return (
      <div className="flex h-full items-center justify-center">
        <span
          className={`truncate rounded-full bg-background px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${tone.weight}`}
          style={{ color: tone.color, boxShadow: moment.tone === "goal" ? "inset 0 0 0 1px var(--rival-green)" : undefined }}
        >
          {moment.label}
        </span>
      </div>
    );
  }

  const displayName = message.authorName;
  if (!displayName) return null;
  const color = side ? SIDE_COLOR[side] : "var(--foreground)";

  return (
    <div className="flex h-full items-center gap-2.5">
      <RivalCharacter name={displayName} imageUrl={message.authorAvatarUrl} size={26} />
      <p className="min-w-0 flex-1 truncate text-sm leading-snug">
        <span className="font-semibold" style={{ color }}>
          {isSelf ? "You" : displayName}
        </span>
        {side && (
          <span className="ml-1 rounded px-1 py-px align-[1px] font-mono text-[9px] font-bold" style={{ color, background: side === "yes" ? "var(--rival-blue-dim)" : "var(--rival-red-dim)" }}>
            {side.toUpperCase()}
          </span>
        )}{" "}
        <span className="text-foreground/85">{message.body}</span>
      </p>
    </div>
  );
}
