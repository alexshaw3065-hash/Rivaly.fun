import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanEvents, cleanId, deviceFrom, hostOf, isBot, short } from "@/lib/analytics/sanitize";

// First-party product analytics intake. The browser batches page views and
// product actions (src/lib/analytics/track.ts) and posts them here; this
// validates everything (sanitize.ts), attaches device, country and the
// signed-in account if any, and writes to analytics_events. Bots are
// dropped. Always answers 204 — tracking must never break the app.

const MAX_BODY = 32_000;

export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return new Response(null, { status: 204 });
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return new Response(null, { status: 204 });
    const body = JSON.parse(text) as Record<string, unknown>;
    const anon = cleanId(body.a);
    const session = cleanId(body.s);
    const events = cleanEvents(body.events);
    if (!anon || !session || events.length === 0) return new Response(null, { status: 204 });

    const src = (body.src && typeof body.src === "object" ? body.src : {}) as Record<string, unknown>;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const country = (request.headers.get("x-vercel-ip-country") ?? "").slice(0, 2).toUpperCase() || null;
    const base = {
      anon_id: anon,
      session_id: session,
      user_id: user?.id ?? null,
      referrer_host: hostOf(src.ref),
      utm_source: short(src.utm_source),
      utm_medium: short(src.utm_medium),
      utm_campaign: short(src.utm_campaign),
      device: deviceFrom(ua),
      country,
    };
    const admin = createAdminClient();
    await admin.from("analytics_events").insert(events.map((e) => ({ ...base, event: e.event, path: e.path, props: e.props, at: e.at })));
    // Stitch this browser's earlier anonymous visits to the account.
    if (user) await admin.from("analytics_identities").upsert({ anon_id: anon, user_id: user.id }, { onConflict: "anon_id", ignoreDuplicates: true });
  } catch {
    // Swallowed on purpose: a malformed beacon is not the user's problem.
  }
  return new Response(null, { status: 204 });
}
