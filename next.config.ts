import type { NextConfig } from "next";

// Forgives the common dashboard paste mistakes: surrounding whitespace or a
// trailing newline, and the variable's own name pasted into its value
// ("KLIPY_API_KEY=abc…"). That exact paste once broke every GIF in production.
function envValue(...names: string[]): string {
  for (const name of names) {
    const raw = process.env[name];
    if (raw && raw.trim()) return raw.trim().replace(/^[A-Z][A-Z0-9_]*=/, "").trim();
  }
  return "";
}

const nextConfig: NextConfig = {
  // Keep pages you've just visited for 30s, like X keeps its tabs: switching
  // back is instant instead of another round trip (seconds on a slow network).
  // Live screens stay live over Realtime; a room shown from this cache
  // refreshes itself once (room-live.tsx). Any action (join, post, sign-in)
  // still refreshes as before.
  experimental: {
    staleTimes: { dynamic: 30 },
  },
  // Personal and utility screens stay out of search results: they're either
  // someone's own account or a form, never an answer to a search. Crawlers
  // may still follow their links (robots.ts only blocks the machinery).
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, follow" }];
    return ["/wallet", "/notifications", "/wishlist", "/rooms/create", "/login", "/signup", "/invite", "/kit", "/auth/:path*", "/admin/:path*"].map(
      (source) => ({ source, headers: noindex }),
    );
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  env: {
    // Klipy's terms require GIF searches to run in the user's browser, so its
    // key is public by design. Accept it under either name.
    NEXT_PUBLIC_KLIPY_API_KEY: envValue("NEXT_PUBLIC_KLIPY_API_KEY", "KLIPY_API_KEY"),
  },
};

export default nextConfig;
