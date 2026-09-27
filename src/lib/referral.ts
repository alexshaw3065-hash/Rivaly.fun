"use client";

// Referral links: every link a signed-in person shares carries ?ref=their
// username, so a newcomer who arrives through it is attributed to them
// (first-touch, recorded at signup — see src/lib/analytics/track.ts). That
// makes the core growth loop measurable: who brings rivals in, and whether
// those rivals stake. Principle #10: great products grow through people.

import { SITE_URL } from "@/lib/site";

let referrer: string | null = null;

/** Set once from the signed-in profile (current-user-provider.tsx). */
export function setReferrer(username: string | null) {
  referrer = username && /^[A-Za-z0-9_]{2,30}$/.test(username) ? username : null;
}

/** The URL with ?ref=<you> added (or left alone when signed out, or already tagged). */
export function withRef(url: string): string {
  if (!referrer) return url;
  try {
    const u = new URL(url, SITE_URL);
    if (!u.searchParams.has("ref")) u.searchParams.set("ref", referrer);
    return u.toString();
  } catch {
    return url;
  }
}
