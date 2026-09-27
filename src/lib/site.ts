// Rivaly's public address. Every link that leaves the app — shares, invites,
// referral links, link previews — is built from this, never from whatever
// host the sharer happens to be on (an old vercel.app address, a preview
// deploy, localhost), so a shared link always carries the real domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://rivaly.fun").replace(/\/+$/, "");

export function siteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
