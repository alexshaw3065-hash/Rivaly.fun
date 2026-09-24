// Turns a raw TxLINE match event into the one line the room's feed shows —
// or null for the ~30 action types nobody in a room cares about in the
// moment (substitutions, corners, conversions, corrections). Shared by the
// server's initial fetch and the browser's realtime stream so both read the
// same. Environment-agnostic: no Supabase client here.

export type EventTone = "goal" | "card" | "var" | "whistle" | "takeover-yes" | "takeover-no";

export interface MatchMoment {
  label: string;
  tone: EventTone;
}

const at = (minute: number | null | undefined) => (typeof minute === "number" && minute > 0 ? ` ${minute}'` : "");

export function matchMoment(action: string, minute: number | null | undefined, payload: Record<string, unknown> | null): MatchMoment | null {
  const p = payload ?? {};
  switch (action) {
    case "kickoff":
      return { label: "Kick-off", tone: "whistle" };
    case "halftime_finalised":
      return { label: "Half-time", tone: "whistle" };
    case "game_finalised":
      return { label: "Full time", tone: "whistle" };
    case "goal":
      return { label: `⚽ GOAL${at(minute)}`, tone: "goal" };
    case "touchdown":
      return { label: `🏈 TOUCHDOWN${at(minute)}`, tone: "goal" };
    case "field_goal":
      return p.Outcome === "successful" ? { label: `🏈 Field goal${at(minute)}`, tone: "goal" } : null;
    case "safety":
      return { label: `Safety${at(minute)}`, tone: "goal" };
    case "penalty":
      return { label: `Penalty${at(minute)}`, tone: "var" };
    case "yellow_card":
      return { label: `🟨 Yellow card${at(minute)}`, tone: "card" };
    case "red_card":
      return { label: `🟥 Red card${at(minute)}`, tone: "card" };
    case "var":
      return { label: `VAR check${typeof p.Type === "string" ? ` · ${p.Type.toLowerCase()}` : ""}`, tone: "var" };
    case "var_end":
      return { label: `VAR: ${p.Outcome === "Overturned" ? "overturned" : "decision stands"}`, tone: "var" };
    default:
      return null;
  }
}

/** System feed rows carry their tone in the body prefix so one field round-trips. */
export const MOMENT_PREFIX: Record<EventTone, string> = {
  goal: "§goal§",
  card: "§card§",
  var: "§var§",
  whistle: "§whistle§",
  "takeover-yes": "§takeover-yes§",
  "takeover-no": "§takeover-no§",
};

/** The feed line when an end of the room takes over the stadium. */
export function takeoverMoment(side: "yes" | "no"): MatchMoment {
  return { label: `🏟 ${side.toUpperCase()} end took the stadium`, tone: side === "yes" ? "takeover-yes" : "takeover-no" };
}

export function encodeMoment(m: MatchMoment): string {
  return `${MOMENT_PREFIX[m.tone]}${m.label}`;
}

export function decodeMoment(body: string): MatchMoment {
  for (const [tone, prefix] of Object.entries(MOMENT_PREFIX) as [EventTone, string][]) {
    if (body.startsWith(prefix)) return { tone, label: body.slice(prefix.length) };
  }
  return { tone: "whistle", label: body };
}
