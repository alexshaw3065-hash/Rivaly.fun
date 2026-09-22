import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Nav } from "@/components/nav";
import { CurrentUserProvider } from "@/components/current-user-provider";
import { DynamicProvider } from "@/components/dynamic-provider";
import { WalletProvider } from "@/lib/wallet/wallet-context";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headline-only display face: Cabinet Grotesk (Fontshare — deliberately not
// a Google Fonts reflex pick like Inter/Space Grotesk/Sora). Confident,
// slightly unconventional grotesque with real weight range — carries the
// "editorial sports culture" identity from the redesign brief. Body copy
// stays on Geist so the rest of the interface stays calm.
//
// Actually self-hosted (next/font/local, files in src/fonts/) rather than a
// runtime <link> to Fontshare's CDN — previously the app depended on an
// external stylesheet fetch on every load; this removes that dependency
// and gets Next's own font-loading optimizations (no CLS, no external
// network round-trip) same as Geist above.
const cabinetGrotesk = localFont({
  src: [
    { path: "../fonts/cabinet-grotesk/CabinetGrotesk-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cabinet-grotesk/CabinetGrotesk-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cabinet-grotesk/CabinetGrotesk-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/cabinet-grotesk/CabinetGrotesk-Extrabold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-cabinet-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rivaly",
  description: "Back your football opinion. Predict against people, not the house.",
};

// Dark is the brand default (see globals.css) — this only ever adds `.light`,
// never removes it, so a missing/blocked script still renders dark, matching
// the fallback baked into :root. Runs before paint to avoid a flash of the
// wrong theme; kept inline rather than in an external file so it blocks.
const themeInitScript = `(function(){try{if(localStorage.getItem('rivaly-theme')==='light'){document.documentElement.classList.add('light');}if(localStorage.getItem('rivaly-sidebar-collapsed')==='true'){document.documentElement.classList.add('sidebar-collapsed');}}catch(e){}})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const currentProfile = await getCurrentProfile();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cabinetGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      {/* Deliberately NOT display:flex. Nav's sidebar/header/bottom-bar are
          all fixed or sticky positioned (never flex siblings of the page
          content), and the content-shell div Nav wraps children in
          (nav.tsx) only ever uses padding to make room for them — but
          making body itself a flex column once turned <main> into a flex
          item whose cross-axis (width) stretch-resolution goes through the
          flex algorithm instead of plain block "fill the containing
          block." With certain deeply-nested content (a flex row with
          overflow-x:auto and flex-shrink:0 children — Top Rivals, Goated
          Rivals, the Exploding Now carousel track) that resolution fell
          back to shrink-to-fit instead of the viewport width, blowing
          <main> out to however wide its widest row's content was —
          confirmed by toggling body to display:block live and watching
          <main> snap from 1024px back to 375px. Plain block flow doesn't
          have this failure mode at all, so nothing in this tree — body,
          Nav, or content-shell — should ever go back to flex for layout.
          overflow-x-hidden stays as a cheap backstop. */}
      <body className="min-h-full overflow-x-hidden bg-background text-foreground pb-16 md:pb-0">
        <CurrentUserProvider profile={currentProfile}>
          <DynamicProvider>
            {/* Inside DynamicProvider (needs its wallet list to sign) and
                CurrentUserProvider (the profile carries the address). */}
            <WalletProvider>
              <Nav>{children}</Nav>
            </WalletProvider>
          </DynamicProvider>
        </CurrentUserProvider>
      </body>
    </html>
  );
}
