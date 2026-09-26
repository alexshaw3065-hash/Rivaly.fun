import { createClient } from "@/lib/supabase/client";

// Report-and-remove (supabase/migrations/20260926300000_report_and_remove.sql):
// reported content disappears for the reporter at once, and for everyone
// after three different people report it.

export type ReportReason = "abuse" | "hate" | "explicit" | "spam" | "other";

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "abuse", label: "Abuse or harassment" },
  { id: "hate", label: "Hate or slurs" },
  { id: "explicit", label: "Sexual or explicit" },
  { id: "spam", label: "Spam or a scam" },
  { id: "other", label: "Something else" },
];

const REFUSALS: Record<string, string> = {
  report_rate_limit: "That's a lot of reports — give it a while.",
  own_content: "You can't report yourself.",
};

/** Null when it went through, otherwise what to tell the person. */
export async function reportContent(kind: "message" | "post", id: string, reason: ReportReason): Promise<string | null> {
  const { error } = await createClient().rpc("report_content", { p_kind: kind, p_id: id, p_reason: reason });
  if (!error) return null;
  const code = Object.keys(REFUSALS).find((k) => error.message.includes(k));
  return code ? REFUSALS[code] : "Couldn't send that report — try again.";
}
