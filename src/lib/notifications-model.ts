// What a notification says and where it goes — pure, tested
// (notifications-model.test.ts). Rows are written by database triggers
// (supabase/migrations/20260927100000_notifications.sql).

export type NotificationKind =
  | "joined"
  | "big_stake"
  | "faded"
  | "kickoff"
  | "won"
  | "lost"
  | "refunded"
  | "reply"
  | "mention"
  | "follow"
  | "league_join"
  | "creator_room";

export interface NotificationActor {
  username: string | null;
  name: string;
  avatar: string | null;
}

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actor: NotificationActor | null;
  roomId: string | null;
  postId: string | null;
  data: {
    side?: "yes" | "no";
    amount?: number;
    payout?: number;
    pool?: number;
    prediction?: string;
    outcome?: string | null;
    body?: string;
    parentId?: string | null;
    league?: string;
  };
  createdAt: string;
  read: boolean;
}

export interface NotificationView {
  /** Who did it (bold), then what happened. No actor → the line stands alone. */
  who: string | null;
  text: string;
  /** Second line: the room's claim, or what they wrote. */
  detail: string | null;
  href: string;
  tone: "win" | "live" | "neutral";
}

const money = (cents: number | undefined) => {
  const d = (cents ?? 0) / 100;
  return `$${d.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(d) ? 0 : 2, maximumFractionDigits: 2 })}`;
};
const side = (s: string | undefined | null) => (s ? s.toUpperCase() : "");

export function describe(n: AppNotification): NotificationView {
  const who = n.actor?.name ?? null;
  const room = n.roomId ? `/rooms/${n.roomId}` : "/rooms";
  const claim = n.data.prediction ?? null;
  const thread = `/arena/p/${n.data.parentId ?? n.postId}`;
  switch (n.kind) {
    case "joined":
      return { who, text: `backed ${side(n.data.side)} with ${money(n.data.amount)} in your room`, detail: claim, href: room, tone: "neutral" };
    case "big_stake":
      return { who, text: `just put ${money(n.data.amount)} on ${side(n.data.side)}`, detail: claim ? `${claim} · pot ${money(n.data.pool)}` : null, href: room, tone: "live" };
    case "faded":
      return { who, text: `is fading you — called ${side(n.data.side)}`, detail: n.data.body || claim, href: n.postId ? `/arena/p/${n.postId}` : room, tone: "neutral" };
    case "kickoff":
      return { who: null, text: `Kickoff — your room is live`, detail: claim ? `${claim} · you're on ${side(n.data.side)}` : null, href: room, tone: "live" };
    case "won":
      return {
        who: null,
        text: `You called it — +${money((n.data.payout ?? 0) - (n.data.amount ?? 0))}`,
        detail: claim ? `${claim} · ${money(n.data.payout)} to your wallet` : null,
        href: room,
        tone: "win",
      };
    case "lost":
      return { who: null, text: `${side(n.data.outcome) || "The other side"} took this one`, detail: claim ? `${claim} · you backed ${side(n.data.side)}` : null, href: room, tone: "neutral" };
    case "refunded":
      return { who: null, text: `Your ${money(n.data.amount)} is back in your wallet`, detail: claim, href: room, tone: "neutral" };
    case "reply":
      return { who, text: "replied to you", detail: n.data.body || null, href: thread, tone: "neutral" };
    case "mention":
      return { who, text: "mentioned you", detail: n.data.body || null, href: thread, tone: "neutral" };
    case "follow":
      return { who, text: "followed you", detail: null, href: n.actor?.username ? `/profile/${n.actor.username}` : "/arena", tone: "neutral" };
    case "creator_room":
      return { who, text: "opened a room", detail: claim, href: room, tone: "live" };
    case "league_join":
      return { who, text: `joined ${n.data.league ?? "your league"}`, detail: null, href: "/arena?tab=leagues", tone: "neutral" };
  }
}

/** Today / Yesterday / Earlier, newest first within each. */
export function groupByDay(list: AppNotification[], now = new Date()): { label: string; items: AppNotification[] }[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  const groups = [
    { label: "Today", items: [] as AppNotification[] },
    { label: "Yesterday", items: [] as AppNotification[] },
    { label: "Earlier", items: [] as AppNotification[] },
  ];
  for (const n of list) {
    const t = new Date(n.createdAt).getTime();
    groups[t >= startOfToday ? 0 : t >= startOfToday - day ? 1 : 2].items.push(n);
  }
  return groups.filter((g) => g.items.length > 0);
}
