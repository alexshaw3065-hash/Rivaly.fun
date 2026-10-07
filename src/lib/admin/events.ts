// Platform events → one readable line each, for the live stream, user
// timelines and room audit history. Pure (tested in events.test.ts).

export interface PlatformEvent {
  id: string;
  at: string;
  type: string;
  user_id: string | null;
  room_id: string | null;
  match_id: string | null;
  tx_signature: string | null;
  amount_cents: number | null;
  metadata: Record<string, unknown>;
  source: string;
  status: "ok" | "pending" | "failed";
}

export interface EventContext {
  /** user id → display name */
  users: Record<string, string>;
  /** room id → prediction */
  rooms: Record<string, string>;
  /** match id → "Home v Away" */
  matches: Record<string, string>;
}

export type EventTone = "neutral" | "money" | "good" | "warn" | "bad" | "admin";

export interface EventLine {
  text: string;
  tone: EventTone;
  /** Admin page to open for it. */
  href: string | null;
}

const usd = (cents: number | null | undefined) => {
  const d = (cents ?? 0) / 100;
  return `$${d.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(d) ? 0 : 2, maximumFractionDigits: 2 })}`;
};

export function describeEvent(e: PlatformEvent, ctx: EventContext): EventLine {
  const who = (e.user_id && ctx.users[e.user_id]) || (e.user_id ? "Someone" : "");
  const room = e.room_id ? `“${ctx.rooms[e.room_id] ?? "a room"}”` : "";
  const match = e.match_id ? ctx.matches[e.match_id] ?? "a match" : "";
  const m = e.metadata ?? {};
  const side = typeof m.side === "string" ? m.side.toUpperCase() : "";
  const roomHref = e.room_id ? `/admin/rooms/${e.room_id}` : null;
  const userHref = e.user_id ? `/admin/users/${e.user_id}` : null;

  switch (e.type) {
    case "USER_SIGNUP":
      return { text: `${who} joined Rivaly`, tone: "good", href: userHref };
    case "USER_LOGIN":
      return { text: `${who} signed in`, tone: "neutral", href: userHref };
    case "WALLET_CONNECTED":
      return { text: `${who}'s wallet is ready`, tone: "neutral", href: userHref };
    case "USER_PROFILE_UPDATED":
      return { text: `${who} updated their profile`, tone: "neutral", href: userHref };
    case "ROOM_CREATED":
      return { text: `${who} opened ${room}`, tone: "good", href: roomHref };
    case "STAKE_PLACED":
      return { text: m.is_creator ? `${who} backed their own room with ${usd(e.amount_cents)} on ${side}` : `${who} put ${usd(e.amount_cents)} on ${side} in ${room}`, tone: "money", href: roomHref };
    case "STAKE_FAILED":
      return { text: `${who}'s ${usd(e.amount_cents)} stake failed${m.error ? ` — ${String(m.error).slice(0, 80)}` : ""}`, tone: "bad", href: userHref };
    case "ROOM_STARTED":
      return { text: `${room} is live — ${usd(e.amount_cents)} in the pot`, tone: "neutral", href: roomHref };
    case "ROOM_CANCELLED":
      return { text: `${room} was cancelled`, tone: "warn", href: roomHref };
    case "MATCH_STARTED":
      return { text: `${match} kicked off`, tone: "neutral", href: null };
    case "MATCH_FINISHED":
      return { text: `${match} finished ${m.score ?? ""}`.trim(), tone: "neutral", href: null };
    case "RESULT_HELD":
      return { text: `${room} decided early (${String(m.outcome ?? "").toUpperCase()}) — safety window running`, tone: "warn", href: roomHref };
    case "RESULT_RECEIVED":
      return { text: `Result in for ${room}: ${String(m.outcome ?? "").toUpperCase()}`, tone: "good", href: roomHref };
    case "SETTLEMENT_COMPLETED":
      return { text: m.status === "refunded" ? `${room} refunded` : `${room} settled — ${usd(e.amount_cents)} pot`, tone: "good", href: roomHref };
    case "SETTLEMENT_FAILED":
      return { text: `Settlement failed for ${room}${m.error ? `: ${String(m.error).slice(0, 80)}` : ""}`, tone: "bad", href: roomHref };
    case "PAYOUT_SENT":
      return { text: `${usd(e.amount_cents)} paid to ${who}`, tone: "money", href: roomHref };
    case "REFUND_SENT":
      return { text: `${usd(e.amount_cents)} refunded to ${who}`, tone: "money", href: roomHref };
    case "FEE_EARNED":
      return { text: m.kind === "host" ? `${who} earned ${usd(e.amount_cents)} hosting ${room}` : `Rivaly earned ${usd(e.amount_cents)} from ${room}`, tone: "money", href: roomHref };
    case "CLAIM_STARTED":
      return { text: m.kind === "rivaly" ? `Rivaly fee withdrawal of ${usd(e.amount_cents)} started` : `${who} is claiming ${usd(e.amount_cents)} of host earnings`, tone: "money", href: userHref };
    case "CLAIM_COMPLETED":
      return { text: m.kind === "rivaly" ? `${usd(e.amount_cents)} of Rivaly fees withdrawn` : `${who} claimed ${usd(e.amount_cents)}`, tone: "money", href: userHref };
    case "CLAIM_FAILED":
      return { text: `${m.kind === "rivaly" ? "Rivaly withdrawal" : `${who}'s claim`} of ${usd(e.amount_cents)} failed — back to claimable`, tone: "bad", href: userHref };
    case "SIGNUP_GRANT":
      return { text: `${who} got their ${usd(e.amount_cents)} sign-up grant`, tone: "money", href: userHref };
    case "SIGNUP_GRANT_FAILED":
      return { text: `${who}'s ${usd(e.amount_cents)} sign-up grant failed — will retry`, tone: "bad", href: userHref };
    case "DEPOSIT":
      return { text: `${who} deposited ${usd(e.amount_cents)}`, tone: "money", href: userHref };
    case "WITHDRAWAL":
      return { text: `${who} withdrew ${usd(e.amount_cents)}`, tone: "money", href: userHref };
    case "POST_CREATED":
      return { text: `${who} posted in the Arena${side ? ` (called ${side})` : ""}`, tone: "neutral", href: userHref };
    case "REPLY_CREATED":
      return { text: `${who} replied in the Arena`, tone: "neutral", href: userHref };
    case "CHAT_MESSAGE":
      return { text: `${who} chatted in ${room}`, tone: "neutral", href: roomHref };
    case "REACTION":
      return { text: `${who} reacted ${typeof m.emoji === "string" ? m.emoji : ""}`.trim(), tone: "neutral", href: userHref };
    case "FOLLOW": {
      const target = typeof m.following_id === "string" ? ctx.users[m.following_id] ?? "someone" : "someone";
      return { text: `${who} followed ${target}`, tone: "neutral", href: userHref };
    }
    case "LEAGUE_JOINED":
      return { text: `${who} joined a league`, tone: "neutral", href: userHref };
    case "REPORT_CREATED":
      return { text: `${who} reported a ${String(m.target ?? "post")} (${String(m.reason ?? "")})`, tone: "warn", href: "/admin/moderation" };
    case "ADMIN_LOGIN":
      return { text: "Someone signed in to Rivaly Ops", tone: "admin", href: "/admin/system?tab=audit" };
    case "ADMIN_LOGIN_FAILED":
      return { text: "Failed Rivaly Ops sign-in (wrong password)", tone: "bad", href: "/admin/system?tab=audit" };
    case "MODERATION_ACTION":
    case "ADMIN_ACTION":
      return { text: `Admin: ${String(m.action ?? "action").replaceAll("_", " ")}${m.reason ? ` — ${String(m.reason)}` : ""}`, tone: "admin", href: e.room_id ? roomHref : userHref };
    case "MATCH_SCORE_DISPUTED":
      return { text: `Score in dispute: Big Balls says ${String(m.ours ?? "?")} on one record and ${String(m.twin ?? "?")} on the other — rooms held`, tone: "bad", href: "/admin/matches" };
    case "SYSTEM_ERROR":
      return { text: `System error${m.job ? ` in ${String(m.job)}` : ""}: ${String(m.error ?? "").slice(0, 100)}`, tone: "bad", href: "/admin/system?tab=errors" };
    default:
      return { text: e.type.toLowerCase().replaceAll("_", " "), tone: e.status === "failed" ? "bad" : "neutral", href: roomHref ?? userHref };
  }
}

/** The event types an operator can filter the stream by, grouped. */
export const EVENT_GROUPS: { label: string; types: string[] }[] = [
  { label: "People", types: ["USER_SIGNUP", "USER_LOGIN", "WALLET_CONNECTED", "USER_PROFILE_UPDATED", "FOLLOW"] },
  { label: "Rooms", types: ["ROOM_CREATED", "STAKE_PLACED", "ROOM_STARTED", "ROOM_CANCELLED"] },
  { label: "Results", types: ["MATCH_STARTED", "MATCH_FINISHED", "RESULT_HELD", "RESULT_RECEIVED", "SETTLEMENT_COMPLETED"] },
  { label: "Money", types: ["PAYOUT_SENT", "REFUND_SENT", "FEE_EARNED", "CLAIM_STARTED", "CLAIM_COMPLETED", "SIGNUP_GRANT", "DEPOSIT", "WITHDRAWAL"] },
  { label: "Social", types: ["POST_CREATED", "REPLY_CREATED", "CHAT_MESSAGE", "REACTION", "LEAGUE_JOINED"] },
  { label: "Problems", types: ["STAKE_FAILED", "SETTLEMENT_FAILED", "CLAIM_FAILED", "SIGNUP_GRANT_FAILED", "SYSTEM_ERROR", "REPORT_CREATED", "MATCH_SCORE_DISPUTED"] },
  { label: "Admin", types: ["MODERATION_ACTION", "ADMIN_ACTION", "ADMIN_LOGIN", "ADMIN_LOGIN_FAILED"] },
];
