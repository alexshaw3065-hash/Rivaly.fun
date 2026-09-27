import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Password sign-in to /admin. The password (ADMIN_PASSWORD) and the key that
// signs sessions (ADMIN_SESSION_SECRET) live only in the environment. A
// session is a signed, httpOnly, same-site-strict cookie scoped to /admin
// that expires after 12 hours; changing ADMIN_SESSION_SECRET signs everyone
// out at once.

export const ADMIN_COOKIE = "rivaly_ops";
const TTL_MS = 12 * 60 * 60_000;

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

export function passwordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 12 && secret());
}

/** Constant-time comparison, so response timing can't leak how much of a guess was right. */
export function passwordMatches(guess: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = createHash("sha256").update(guess).digest();
  const b = createHash("sha256").update(real).digest();
  return timingSafeEqual(a, b);
}

export function newSessionValue(): string {
  const key = secret();
  if (!key) throw new Error("ADMIN_SESSION_SECRET is not set");
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS, n: randomBytes(12).toString("base64url") })).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function sessionValid(value: string | undefined): boolean {
  const key = secret();
  if (!key || !value) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return false;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export async function hasPasswordSession(): Promise<boolean> {
  return sessionValid((await cookies()).get(ADMIN_COOKIE)?.value);
}

export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/admin", maxAge: TTL_MS / 1000 };
