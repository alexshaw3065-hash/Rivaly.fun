"use client";

import { useCurrentUser } from "@/components/current-user-provider";
import { openAuthModal } from "@/lib/auth-modal-store";
import { openArenaComposer, type ComposerRoom } from "@/lib/arena/composer-store";
import type { Side } from "@/lib/arena/model";

const COLOR: Record<Side, string> = { yes: "var(--rival-blue)", no: "var(--rival-red)" };

function useOpenAbout() {
  const me = useCurrentUser();
  return (room: ComposerRoom) => (me ? openArenaComposer({ room }) : openAuthModal({ next: `/rooms/${room.id}` }));
}

interface RoomRef {
  id: string;
  prediction: string;
  matchId: string | null;
}

/**
 * Inside a public room: post about it to the Arena from right here. Backed
 * it → "Call it" (a call on your side, a receipt later). Not backed → "Share
 * to Arena" (a quote people can join from).
 */
export function RoomArenaCta({ room, mySide, canQuote }: { room: RoomRef; mySide: Side | null; canQuote: boolean }) {
  const openAbout = useOpenAbout();
  if (!mySide && !canQuote) return null;
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface px-4 py-3 edge">
      <p className="min-w-0 flex-1 text-body text-secondary">
        {mySide ? (
          <>
            You&rsquo;re on <span className="font-bold uppercase" style={{ color: COLOR[mySide] }}>{mySide}</span>. Say it in the Arena.
          </>
        ) : (
          "Bring rivals in from the Arena."
        )}
      </p>
      <button
        type="button"
        onClick={() => openAbout({ ...room, side: mySide })}
        className={`h-9 shrink-0 rounded-full px-4 text-label font-bold text-white transition-transform duration-100 active:scale-95 ${mySide === "no" ? "bg-no" : "bg-yes"}`}
      >
        {mySide ? `Call it · ${mySide.toUpperCase()}` : "Share to Arena"}
      </button>
    </div>
  );
}

/** On a room card: quote the room in the Arena in one tap. */
export function ArenaQuoteButton({ room }: { room: RoomRef }) {
  const openAbout = useOpenAbout();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openAbout({ ...room, side: null });
      }}
      aria-label="Share to the Arena"
      title="Share to the Arena"
      className="relative shrink-0 p-0.5 text-secondary transition-[transform,color] duration-100 before:absolute before:-inset-2 hover:text-foreground active:scale-90"
    >
      <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
        <path d="M3.5 5.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.5 3v-3a2 2 0 0 1-2-2v-6Z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
        <path d="M10 6.5v4M8 8.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}
