import { createHash, timingSafeEqual } from "node:crypto";

// The cron routes' guard: `Authorization: Bearer <CRON_SECRET>`, compared in
// constant time (hashing both sides first makes the lengths equal), so the
// response time says nothing about how much of a guess was right.
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(a, b);
}
