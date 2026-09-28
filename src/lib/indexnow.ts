import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL, siteUrl } from "@/lib/site";

// IndexNow: tells Bing (whose index ChatGPT search and Copilot draw on),
// Yandex, Seznam and Naver the moment pages are new or changed, instead of
// waiting for their crawlers to come round. The key isn't a secret — the
// protocol proves site ownership by serving it at /<key>.txt (public/).
export const INDEXNOW_KEY = "59d832aa9d3e36059d677dfd338e8ab6";

export async function submitToIndexNow(urls: string[]): Promise<number> {
  if (urls.length === 0) return 0;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: INDEXNOW_KEY,
      keyLocation: siteUrl(`/${INDEXNOW_KEY}.txt`),
      urlList: urls.slice(0, 10_000),
    }),
  });
  // 200 = accepted, 202 = accepted, key check pending.
  if (!res.ok) throw new Error(`indexnow ${res.status}`);
  return urls.length;
}

/**
 * Public rooms and profiles new or changed since `sinceMs` ago, plus the
 * pages that list them. Runs from the hourly job; a quiet hour sends nothing.
 */
export async function submitRecentPages(sinceMs = 70 * 60_000): Promise<{ submitted: number }> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - sinceMs).toISOString();
  const [created, settled, profiles] = await Promise.all([
    admin.from("rooms").select("id").eq("visibility", "public").gte("created_at", since).limit(5000),
    admin.from("rooms").select("id").eq("visibility", "public").gte("settled_at", since).limit(5000),
    admin.from("profiles").select("username").not("username", "is", null).gte("created_at", since).limit(5000),
  ]);
  const rooms = new Set([...(created.data ?? []), ...(settled.data ?? [])].map((r) => r.id as string));
  const urls = [
    ...[...rooms].map((id) => siteUrl(`/rooms/${id}`)),
    ...(profiles.data ?? []).map((p) => siteUrl(`/profile/${encodeURIComponent(p.username as string)}`)),
  ];
  if (urls.length === 0) return { submitted: 0 };
  return { submitted: await submitToIndexNow([siteUrl("/"), siteUrl("/rooms"), ...urls]) };
}
