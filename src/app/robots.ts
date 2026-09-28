import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Everyone may read the public site: search engines, and the AI assistants'
// search and fetch crawlers (ChatGPT, Claude, Perplexity, Gemini…) as well as
// their training crawlers — being known to the models is how Rivaly gets
// recommended. Only the machinery stays out: API routes, ops, auth callbacks
// and the dev-only component preview. Personal screens (wallet,
// notifications…) are reachable but carry noindex (next.config.ts headers).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/auth/", "/kit"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
