"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, cookieOptions, newSessionValue, passwordConfigured, passwordMatches } from "@/lib/admin/session";

// Signing in to /admin with the ops password. Brute force is capped: 8
// failures from one address in 15 minutes locks that address out, and 40
// failures from anywhere locks the door for everyone until it cools off.
// Every attempt is recorded (IP hashed) and shows in the live stream.

const WINDOW_MS = 15 * 60_000;
const PER_IP = 8;
const GLOBAL = 40;

export async function adminLogin(_: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  if (!passwordConfigured()) return { error: "Password sign-in isn't set up on this deployment (ADMIN_PASSWORD / ADMIN_SESSION_SECRET)." };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "unknown").split(",")[0].trim();
  const ipHash = createHash("sha256").update(`${ip}:${process.env.ADMIN_SESSION_SECRET}`).digest("hex").slice(0, 32);
  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const [{ count: mine }, { count: all }] = await Promise.all([
    admin.from("admin_login_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).eq("ok", false).gt("at", since),
    admin.from("admin_login_attempts").select("id", { count: "exact", head: true }).eq("ok", false).gt("at", since),
  ]);
  if ((mine ?? 0) >= PER_IP || (all ?? 0) >= GLOBAL) return { error: "Too many attempts. Wait 15 minutes." };

  const guess = String(form.get("password") ?? "");
  const ok = guess.length > 0 && passwordMatches(guess);
  await Promise.all([
    admin.from("admin_login_attempts").insert({ ip_hash: ipHash, ok }),
    admin.from("platform_events").insert({ type: ok ? "ADMIN_LOGIN" : "ADMIN_LOGIN_FAILED", source: "admin", status: ok ? "ok" : "failed", metadata: { ip_hash: ipHash } }),
  ]);
  if (!ok) return { error: "Wrong password." };

  (await cookies()).set(ADMIN_COOKIE, newSessionValue(), cookieOptions);
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  redirect("/admin/login");
}
