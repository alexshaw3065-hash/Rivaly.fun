// Rivaly's public address. Every link that leaves the app — shares, invites,
// referral links, link previews, canonical URLs, the sitemap — is built from
// this, never from whatever host the sharer happens to be on (an old
// vercel.app address, a preview deploy, localhost), so a shared link always
// carries the real domain. www is the host Vercel serves (the bare domain
// redirects to it), so canonical URLs point straight at the page, not at a
// redirect.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.rivaly.fun").replace(/\/+$/, "");

export function siteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// How Rivaly describes itself to search engines and AI assistants. One
// source, so the page titles, link previews, structured data and the How
// Rivaly works page never drift apart. Answer-first: the first sentence is
// the definition an assistant can quote as-is.
export const SITE_NAME = "Rivaly";
export const SITE_TITLE = "Rivaly — the social prediction market for football";
export const SITE_DESCRIPTION =
  "Rivaly is a social prediction market for football. Make a call on a match, challenge the people who disagree, watch it together, and the winner is paid automatically — you predict against people, never against the house.";
