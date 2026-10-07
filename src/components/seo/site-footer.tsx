import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { SOCIALS } from "@/lib/socials";

// The way out to everything a first-time visitor (or a search engine / AI
// crawler) might want next, plus the one-line definition of Rivaly in plain
// server-rendered text. Shown on signed-out Home, About and the guide.
// It also links the latest public rooms: the rooms screens load in the
// browser, so without these a crawler's only way to a room is the sitemap.
export async function SiteFooter() {
  const rooms = await latestRooms();
  const links = [
    { href: "/about", label: "About Rivaly" },
    { href: "/docs", label: "How Rivaly works" },
    { href: "/rooms", label: "Rooms" },
    { href: "/arena", label: "Arena" },
    { href: "/support", label: "Support" },
    { href: "/responsible-play", label: "Responsible play" },
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
  ];
  return (
    <footer className="mt-12 border-t border-line pt-6 pb-4 text-caption text-tertiary">
      <nav aria-label="Site" className="flex flex-wrap gap-x-5 gap-y-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-secondary">
            {l.label}
          </Link>
        ))}
        {SOCIALS.map((s) => (
          <a key={s.key} href={s.href} rel="me noopener" target="_blank" className="hover:text-secondary">
            {s.label}
          </a>
        ))}
      </nav>
      {rooms.length > 0 && (
        <nav aria-label="Latest rooms" className="mt-4">
          <p className="text-secondary">Latest rooms</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {rooms.map((r) => (
              <li key={r.id}>
                <Link href={`/rooms/${r.id}`} className="hover:text-secondary">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <p className="mt-3">Rivaly — social prediction for sport. Play people, never the house.</p>
      <p className="mt-1">© {new Date().getFullYear()} Rivaly · 18+ · Beta: balances are test USDC with no cash value.</p>
    </footer>
  );
}

/** The newest public rooms, read like the sitemap: anon key, no cookies. */
async function latestRooms(): Promise<{ id: string; title: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data: rooms } = await db
      .from("rooms")
      .select("id, prediction, match_id")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(8);
    const list = (rooms ?? []) as { id: string; prediction: string; match_id: string }[];
    if (list.length === 0) return [];
    const { data: matches } = await db
      .from("matches")
      .select("id, home_team, away_team")
      .in("id", [...new Set(list.map((r) => r.match_id))]);
    const byId = new Map(((matches ?? []) as { id: string; home_team: string; away_team: string }[]).map((m) => [m.id, m]));
    return list.map((r) => {
      const m = byId.get(r.match_id);
      return { id: r.id, title: m ? `${r.prediction}? ${m.home_team} vs ${m.away_team}` : `${r.prediction}?` };
    });
  } catch {
    return [];
  }
}
