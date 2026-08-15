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

// Dark is the brand default (see globals.css) — this only ever adds `.light`,
// never removes it, so a missing/blocked script still renders dark, matching
// the fallback baked into :root. Runs before paint to avoid a flash of the
// wrong theme; kept inline rather than in an external file so it blocks.
const themeInitScript = `(function(){try{if(localStorage.getItem('rivaly-theme')==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,700,500&display=swap"
        />
      </head>
      {/* overflow-x-hidden is a safety net, not the fix: body is a flex
          column, so a flex item (each page's <main>) needs its own
          min-w-0 or it won't shrink below a wide descendant's intrinsic
          width (e.g. a horizontally-scrolling card row) — classic flexbox
          min-width:auto blowout. This just catches it if a future page
          forgets that. */}
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground pb-16 md:pb-0">
        <Nav />
        {children}
      </body>
    </html>
  );
}
