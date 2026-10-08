import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { hiddenAdminResponse } from "@/lib/admin/hidden";

export async function proxy(request: NextRequest) {
  const hidden = hiddenAdminResponse(request);
  if (hidden) return hidden;

  let response = NextResponse.next({ request });

  // No Supabase project is linked yet (see .env.example) — skip the session
  // refresh rather than crashing every request until one is.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session cookie if needed. Every route that reads the
  // session server-side depends on this running first.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Not for static files or the crawler files (robots.txt, sitemap.xml,
    // manifest, the IndexNow key) — nobody's signed in to those.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt)$).*)",
  ],
};
