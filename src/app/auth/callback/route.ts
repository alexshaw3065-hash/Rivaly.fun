import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lands here after both OAuth (Google/Apple) and email-confirmation
// redirects — both use the same PKCE `code` exchange. `next` carries the
// original destination (e.g. the room the user was trying to join before
// being sent to sign in) so auth doesn't strand them on the homepage.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // OAuth signups never collect a username up front — send them to claim
  // one before continuing wherever they were headed. Checked once here,
  // not in middleware, so this isn't a DB query on every navigation.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username_is_placeholder")
      .eq("id", user.id)
      .single();
    if (profile?.username_is_placeholder) {
      const claimUrl = new URL(`${origin}/auth/complete-profile`);
      claimUrl.searchParams.set("next", next);
      return NextResponse.redirect(claimUrl);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
