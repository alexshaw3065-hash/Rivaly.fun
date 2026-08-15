import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headline-only display face: Cabinet Grotesk (Fontshare, self-hosted CDN —
// deliberately not a Google Fonts reflex pick like Inter/Space Grotesk/Sora).
// Confident, slightly unconventional grotesque with real weight range —
// carries the "editorial sports culture" identity from the redesign brief.
// Body copy stays on Geist so the rest of the interface stays calm.

export const metadata: Metadata = {
  title: "Rivaly",
  description: "Back your football opinion. Predict against people, not the house.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700,500&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground pb-16 md:pb-0">
        <Nav />
        {children}
      </body>
    </html>
  );
}
