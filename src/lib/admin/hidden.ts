import { NextResponse, type NextRequest } from "next/server";

// Rivaly Ops (/admin) is a real 404 — status and all — to anyone with neither
// an ops session nor a signed-in account, before anything renders. Signed-in
// accounts go on to the server-side check (lib/admin/guard.ts), which shows
// non-admins the same 404 page. The only way to the password form is its
// secret path (ADMIN_LOGIN_PATH). Called first thing in the middleware.
export function hiddenAdminResponse(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return null;
  const door = process.env.ADMIN_LOGIN_PATH;
  if (door && door.length >= 16 && pathname === `/admin/login/${door}`) return null;
  if (request.cookies.has("rivaly_ops")) return null;
  if (request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))) return null;
  return new NextResponse("Not found", { status: 404, headers: { "content-type": "text/plain", "x-robots-tag": "noindex" } });
}
