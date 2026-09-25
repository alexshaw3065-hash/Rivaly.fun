import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  env: {
    // Klipy's terms require GIF searches to run in the user's browser, so its
    // key is public by design. Accept it under either name.
    NEXT_PUBLIC_KLIPY_API_KEY: process.env.NEXT_PUBLIC_KLIPY_API_KEY ?? process.env.KLIPY_API_KEY ?? "",
  },
};

export default nextConfig;
