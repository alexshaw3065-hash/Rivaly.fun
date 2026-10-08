import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { hiddenAdminResponse } from "@/lib/admin/hidden";

export async function middleware(request: NextRequest) {
  return hiddenAdminResponse(request) ?? updateSession(request);
}

export const config = {
  matcher: [
    // Every route except static assets and image optimization files —
    // those never need a refreshed session.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
