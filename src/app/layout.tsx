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
      {/* Deliberately NOT display:flex. Nav's own pieces are all sticky/
          fixed positioned, so it never needed flex for layout — but making
          body a flex column turned <main> into a flex item whose
          cross-axis (width) stretch-resolution goes through the flex
          algorithm instead of plain block "fill the containing block."
          With certain deeply-nested content (a flex row with overflow-x:
          auto and flex-shrink:0 children — Top Rivals, Goated Rivals, the
          Exploding Now carousel track) that resolution fell back to
          shrink-to-fit instead of the viewport width, blowing <main> out
          to however wide its widest row's content was — confirmed by
          toggling body to display:block live and watching <main> snap
          from 1024px back to 375px. Plain block flow doesn't have this
          failure mode at all. overflow-x-hidden stays as a cheap backstop. */}
      <body className="min-h-full overflow-x-hidden bg-background text-foreground pb-16 md:pb-0">
        <Nav />
        {children}
      </body>
    </html>
  );
}
