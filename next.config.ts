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
