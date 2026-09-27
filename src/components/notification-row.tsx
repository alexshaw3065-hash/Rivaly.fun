"use client";

import Link from "next/link";
import { RivalCharacter } from "@/components/rival-character";
import { ago } from "@/lib/arena/model";
import type { AppNotification, NotificationView } from "@/lib/notifications-model";

// One line on the notifications page: the person's face (or a mark for
// kickoffs and results), what happened, the room or words behind it.

const TONE: Record<NotificationView["tone"], string> = {
  win: "var(--rival-green)",
  live: "var(--rival-red)",
  neutral: "var(--muted)",
};

export function NotificationRow({ n, view }: { n: AppNotification; view: NotificationView }) {
  return (
    <Link
      href={view.href}
      className="flex items-start gap-3 border-b border-border px-4 py-3.5 transition-colors last:border-0 hover:bg-foreground/[0.03]"
      style={n.read ? undefined : { background: "color-mix(in srgb, var(--rival-blue) 6%, transparent)" }}
    >
      {n.actor ? (
        <RivalCharacter name={n.actor.name} imageUrl={n.actor.avatar} size={40} />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border" aria-hidden>
          <KindMark kind={n.kind} color={TONE[view.tone]} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug text-foreground">
          {view.who && <span className="font-semibold">{view.who} </span>}
          <span style={view.tone === "win" ? { color: "var(--rival-green)", fontWeight: 600 } : undefined}>{view.text}</span>
          <span className="text-muted"> · {ago(n.createdAt)}</span>
        </p>
        {view.detail && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{view.detail}</p>}
      </div>
      {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--rival-blue)" }} aria-label="Unread" />}
    </Link>
  );
}

// A mark for the lines that aren't about a person: kickoff, results.
function KindMark({ kind, color }: { kind: AppNotification["kind"]; color: string }) {
  if (kind === "kickoff")
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
        <circle cx="10" cy="10" r="7.2" stroke={color} strokeWidth="1.6" fill="none" />
        <path d="M10 5.6 13.4 8l-1.3 4H7.9L6.6 8 10 5.6Z" fill={color} />
      </svg>
    );
  if (kind === "won" || kind === "host_earned" || kind === "welcome_grant")
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
        <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "refunded")
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
        <path d="M5 8.5a5.5 5.5 0 1 1 .8 5.2M5 4.5v4h4" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
      <path d="M5 10h10" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
