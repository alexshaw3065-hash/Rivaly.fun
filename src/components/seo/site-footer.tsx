import Link from "next/link";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SOCIALS } from "@/lib/socials";
import { LeagueMark } from "@/components/league-mark";
import { isStuckMatch } from "@/lib/stuck-match";
import { XIcon, TiktokIcon, LinkedInIcon } from "@/components/icons";

// The way out to everything a first-time visitor (or a search engine / AI
// crawler) might want next, plus the one-line definition of Rivaly in plain
// server-rendered text. Shown on signed-out Home, About and the guide.
//
// A directory, not a link dump: the split line (YES blue against NO red, the
// app's own bar) opens it; the line Rivaly stands on and its definition; rooms
// by competition (each league's own badge, how many rooms are open) and the
// latest rooms as call + match; then the site, help, legal and social links.
// The latest rooms matter for crawlers too: the rooms screens load in the
// browser, so without these a crawler's only way to a room is the sitemap.

const COMPETITIONS = ["Premier League", "Champions League", "La Liga", "Serie A", "Bundesliga", "Ligue 1", "MLS", "NFL"];
const SOCIAL_ICONS = { x: XIcon, tiktok: TiktokIcon, linkedin: LinkedInIcon } as const;
const GROUPS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Rivaly",
    links: [
      { href: "/about", label: "About Rivaly" },
      { href: "/docs", label: "How Rivaly works" },
      { href: "/rooms", label: "Rooms" },
      { href: "/arena", label: "Arena" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/support", label: "Support" },
      { href: "/responsible-play", label: "Responsible play" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export async function SiteFooter() {
  const { rooms, open } = await footerData();
  return (
    <footer className="mt-16 pb-6">
      <div aria-hidden className="flex h-0.5 overflow-hidden rounded-full">
        <span className="w-1/2 bg-yes" />
        <span className="w-1/2 bg-no" />
      </div>

      <div className="mt-8 grid gap-10 md:mt-10 md:gap-12 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="text-title-1 font-display text-foreground">
            Play people,
            <br />
            never the house.
          </p>
          <p className="mt-4 max-w-sm text-body text-secondary">
            Rivaly is social prediction for sport. Make a call on a match, someone takes the other side, you watch it together, and the winners split the pool.
          </p>
          <div className="mt-6 flex items-center gap-1">
            {SOCIALS.map(({ key, label, href }) => {
              const Icon = SOCIAL_ICONS[key];
              return (
                <a
                  key={key}
                  href={href}
                  rel="me noopener"
                  target="_blank"
                  aria-label={`Rivaly on ${label}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-secondary transition-colors hover:bg-overlay-1 hover:text-foreground [&>svg]:h-[18px] [&>svg]:w-[18px]"
                >
                  <Icon />
                </a>
              );
            })}
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-2">
          <nav aria-label="Rooms by competition">
            <h2 className="text-label font-semibold text-tertiary">Rooms by competition</h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-1">
              {COMPETITIONS.map((c) => (
                <li key={c}>
                  <Link href={`/rooms?league=${encodeURIComponent(c)}`} className="group flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                      <LeagueMark name={c} size={22} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-label font-semibold text-foreground group-hover:underline">{c}</span>
                      <span className="block text-caption text-tertiary">{open[c] ? `${open[c]} open ${open[c] === 1 ? "room" : "rooms"}` : "Calls & rivals"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {rooms.length > 0 && (
            <nav aria-label="Latest rooms" className="hidden md:block">
              <h2 className="text-label font-semibold text-tertiary">Latest rooms</h2>
              <ul className="mt-4 flex flex-col gap-4">
                {rooms.map((r) => (
                  <li key={r.id}>
                    <Link href={`/rooms/${r.id}`} className="group block min-w-0">
                      <span className="block truncate text-label font-semibold text-foreground group-hover:underline">{r.call}</span>
                      <span className="block truncate text-caption text-tertiary">{r.match}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* Phones: the site links as one compact row (the grouped columns below are desktop only). */}
      <nav aria-label="Site" className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-6 md:hidden">
        {GROUPS.flatMap((g) => g.links).map((l) => (
          <Link key={l.href} href={l.href} className="text-label text-secondary hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Site sections" className="mt-12 hidden grid-cols-3 gap-8 border-t border-line pt-8 md:grid">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h2 className="text-label font-semibold text-tertiary">{g.title}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-label text-secondary hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <p className="mt-6 text-caption text-tertiary md:mt-10">
        © {new Date().getFullYear()} Rivaly — social prediction for sport. 18+ · Beta: balances are test USDC with no cash value.
      </p>
    </footer>
  );
}

/** The newest public rooms and open rooms per competition, read like the sitemap: anon key, no cookies. Cached a minute, shared by every visitor. */
const footerData = unstable_cache(footerDataUncached, ["site-footer-v1"], { revalidate: 60 });

async function footerDataUncached(): Promise<{ rooms: { id: string; call: string; match: string }[]; open: Record<string, number> }> {
  const empty = { rooms: [], open: {} };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return empty;
  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const [{ data: latest }, { data: openRooms }] = await Promise.all([
      db.from("rooms").select("id, prediction, match_id").eq("visibility", "public").order("created_at", { ascending: false }).limit(12),
      db.from("rooms").select("match_id").eq("visibility", "public").in("status", ["open", "live"]).limit(500),
    ]);
    const list = (latest ?? []) as { id: string; prediction: string; match_id: string }[];
    const openList = (openRooms ?? []) as { match_id: string }[];
    const ids = [...new Set([...list.map((r) => r.match_id), ...openList.map((r) => r.match_id)])];
    if (ids.length === 0) return empty;
    const { data: matches } = await db.from("matches").select("id, home_team, away_team, competition, status, kickoff_at").in("id", ids);
    const byId = new Map(((matches ?? []) as { id: string; home_team: string; away_team: string; competition: string; status: string; kickoff_at: string }[]).map((m) => [m.id, m]));
    const open: Record<string, number> = {};
    for (const r of openList) {
      const c = byId.get(r.match_id)?.competition;
      if (c) open[c] = (open[c] ?? 0) + 1;
    }
    // Rooms on a stuck feed (still "scheduled" hours after kick-off) stay out, as in the app's lists.
    const rooms = list
      .filter((r) => {
        const m = byId.get(r.match_id);
        return !m || !isStuckMatch({ status: m.status as "scheduled", kickoffAt: m.kickoff_at });
      })
      .slice(0, 6)
      .map((r) => {
      const m = byId.get(r.match_id);
      return { id: r.id, call: `${r.prediction}?`, match: m ? `${m.home_team} vs ${m.away_team}` : "" };
    });
    return { rooms, open };
  } catch {
    return empty;
  }
}
