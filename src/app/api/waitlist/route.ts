import { NextResponse } from "next/server";
import { getWaitlistClient, isWaitlistConfigured, WAITLIST_TABLE } from "@/lib/waitlist";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { email, source, ref } = (body ?? {}) as {
    email?: string;
    source?: string;
    ref?: string;
  };

  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  // No waitlist project connected yet — accept the email at the UI level but
  // tell the client it wasn't stored, so we never fake a real signup.
  if (!isWaitlistConfigured()) {
    return NextResponse.json({ ok: true, stored: false }, { status: 202 });
  }

  const supabase = getWaitlistClient()!;
  const { error } = await supabase.from(WAITLIST_TABLE).insert({
    email: normalized,
    source: typeof source === "string" ? source.slice(0, 60) : null,
    referral: typeof ref === "string" ? ref.slice(0, 60) : null,
  });

  if (error) {
    // Unique-violation => already on the list. Treat as success, not an error.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, stored: true, already: true });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true });
}

export async function GET() {
  if (!isWaitlistConfigured()) {
    return NextResponse.json({ count: null });
  }
  const supabase = getWaitlistClient()!;
  const { count, error } = await supabase
    .from(WAITLIST_TABLE)
    .select("*", { count: "exact", head: true });

  if (error) return NextResponse.json({ count: null });
  return NextResponse.json({ count: count ?? null });
}
