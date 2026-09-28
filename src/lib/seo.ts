import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

// A page's search and link-preview metadata in one call. Next merges
// metadata shallowly — a page that sets openGraph replaces the layout's whole
// openGraph object — so every page goes through here to keep the shared
// fields (site name, card type) alongside its own title, description and
// canonical URL. The share image comes from the nearest opengraph-image file.

export const OG_BASE = { type: "website", siteName: SITE_NAME, locale: "en_GB" } as const;
export const TWITTER_BASE = { card: "summary_large_image", site: "@Rivaly_fun" } as const;

export function pageMeta({
  title,
  description,
  path,
  noindex = false,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  /** The page's canonical path, e.g. "/rooms/…" — query strings dropped. */
  path: string;
  noindex?: boolean;
  /** Use the title as-is instead of "Title · Rivaly". */
  absoluteTitle?: boolean;
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { ...OG_BASE, title, description, url: path },
    twitter: { ...TWITTER_BASE, title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

// ── Rooms ─────────────────────────────────────────────────────────────

interface SeoRoom {
  id: string;
  prediction: string;
  status: string;
  visibility: string;
  poolTotalCents: number;
  participantCount: number;
  resolvedOutcome?: "yes" | "no" | "void" | null;
  yesTotalCents?: number;
  noTotalCents?: number;
}
interface SeoMatch {
  competition: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  status: string;
  sportId?: number;
}

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** A room's title and description, as a search result or link preview shows it. */
export function roomSummary(room: SeoRoom, match: SeoMatch): { title: string; description: string } {
  const fixture = `${match.homeTeam} vs ${match.awayTeam}`;
  const title = `${room.prediction}? ${fixture}`;
  const crowd =
    room.participantCount > 0
      ? `${room.participantCount} ${room.participantCount === 1 ? "rival" : "rivals"}, ${usd(room.poolTotalCents)} in the pool.`
      : "Nobody's taken the other side yet.";
  // One side empty: whoever "won" just got their own stake back.
  const oneSided = room.poolTotalCents > 0 && (!room.yesTotalCents || !room.noTotalCents);
  const done = room.status === "settled" || room.status === "refunded";
  const result =
    done && oneSided
      ? "Nobody took the other side, so every stake went back."
      : room.status === "refunded" || room.resolvedOutcome === "void"
        ? "Refunded — every stake went back."
      : room.status === "settled" && room.resolvedOutcome
        ? `Settled: ${room.resolvedOutcome === "yes" ? "the call came true" : "the call missed"}; winners were paid automatically.`
        : "Back the call or take the other side — the winner is paid automatically.";
  return { title, description: `${fixture} (${match.competition}), ${day(match.kickoffAt)}. ${crowd} ${result}` };
}

const EVENT_STATUS: Record<string, string> = {
  scheduled: "https://schema.org/EventScheduled",
  live: "https://schema.org/EventScheduled",
  finished: "https://schema.org/EventScheduled",
  postponed: "https://schema.org/EventPostponed",
  cancelled: "https://schema.org/EventCancelled",
};

/** Structured data for a room page: the page, about the real match it's on. */
export function roomJsonLd(room: SeoRoom, match: SeoMatch, url: string) {
  const { title, description } = roomSummary(room, match);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url,
    isPartOf: { "@id": `${url.split("/rooms/")[0]}/#website` },
    about: {
      "@type": "SportsEvent",
      name: `${match.homeTeam} vs ${match.awayTeam}`,
      description: match.competition,
      startDate: match.kickoffAt,
      eventStatus: EVENT_STATUS[match.status] ?? EVENT_STATUS.scheduled,
      sport: match.sportId === 6 ? "American football" : "Football (soccer)",
      homeTeam: { "@type": "SportsTeam", name: match.homeTeam },
      awayTeam: { "@type": "SportsTeam", name: match.awayTeam },
      competitor: [
        { "@type": "SportsTeam", name: match.homeTeam },
        { "@type": "SportsTeam", name: match.awayTeam },
      ],
    },
  };
}
