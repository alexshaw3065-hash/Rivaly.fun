import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/site";

// Every page a search engine or AI assistant should know about: the fixed
// pages, then every public room, rival profile and Arena post. Read with the
// anon key (no cookies), so it sees exactly what a signed-out visitor can:
// private rooms and hidden posts never appear. Rebuilt at most hourly.
export const revalidate = 3600;

const LIMIT = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), changeFrequency: "hourly", priority: 1 },
    { url: siteUrl("/docs"), changeFrequency: "monthly", priority: 0.9 },
    { url: siteUrl("/about"), changeFrequency: "monthly", priority: 0.9 },
    { url: siteUrl("/rooms"), changeFrequency: "hourly", priority: 0.8 },
    { url: siteUrl("/arena"), changeFrequency: "hourly", priority: 0.7 },
    { url: siteUrl("/support"), changeFrequency: "monthly", priority: 0.4 },
    { url: siteUrl("/responsible-play"), changeFrequency: "yearly", priority: 0.3 },
    { url: siteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: siteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return fixed;
  const db = createClient(url, key, { auth: { persistSession: false } });

  const [rooms, profiles, posts] = await Promise.all([
    db.from("rooms").select("id, created_at, settled_at").eq("visibility", "public").order("created_at", { ascending: false }).limit(LIMIT),
    db.from("profiles").select("username, created_at").not("username", "is", null).order("created_at", { ascending: false }).limit(LIMIT),
    db.from("posts").select("id, created_at").is("parent_id", null).order("created_at", { ascending: false }).limit(LIMIT),
  ]);

  return [
    ...fixed,
    ...(rooms.data ?? []).map((r) => ({
      url: siteUrl(`/rooms/${r.id}`),
      lastModified: r.settled_at ?? r.created_at,
      changeFrequency: r.settled_at ? ("yearly" as const) : ("hourly" as const),
      priority: r.settled_at ? 0.4 : 0.7,
    })),
    ...(profiles.data ?? []).map((p) => ({
      url: siteUrl(`/profile/${encodeURIComponent(p.username)}`),
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    ...(posts.data ?? []).map((p) => ({
      url: siteUrl(`/arena/p/${p.id}`),
      lastModified: p.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.3,
    })),
  ];
}
