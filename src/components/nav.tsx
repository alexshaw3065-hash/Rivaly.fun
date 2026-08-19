"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./avatar";
import { ThemeToggle } from "./theme-toggle";
import { TopBarIcons } from "./top-bar-icons";
import { Sidebar } from "./sidebar";
import { DesktopHeader } from "./desktop-header";

// V1 sitemap only — see docs/masterplan/08-v1-scope.md. Do not add links for
// Communities, Streaming, Tournaments, etc. until V1 scope changes.
//
// Two physically different navs, not one responsive one: 95% of the target
// audience is mobile (docs/masterplan/09-competitive-research.md#1), so
// mobile keeps its own top bar + bottom tab bar (the one-handed pattern the
// research calls for) untouched, while desktop gets a collapsible left
// sidebar + top header (sidebar.tsx, desktop-header.tsx) per the founder's
// Polymarket-style direction — not a squeezed-down version of the mobile bar.
const tabs = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/rooms", label: "Rooms" },
  { href: "/following", label: "Following" },
  { href: "/wallet", label: "Wallet" },
];

// The self-profile stand-in until auth exists — see src/lib/mock-data.ts.
const SELF_USERNAME = "victorj";
const SELF_NAME = "Victor";

export function Nav({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile top bar — unchanged, md:hidden. Search (mobile) is its own
          roll-up-sheet chrome layered inside the page (see search/page.tsx),
          not a takeover — the founder's own reference video of Polymarket
          shows their top nav staying visible while the search sheet is
          open, and explicitly called out our bottom tab bar disappearing
          as wrong. The app's nav stays reachable on every route. */}
      <nav className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm md:hidden">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link href="/" className="font-display text-base font-bold tracking-tight text-foreground">
            Rivaly
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <TopBarIcons />
            <ThemeToggle />
            <Link href={`/profile/${SELF_USERNAME}`} className="shrink-0">
              <Avatar name={SELF_NAME} size={32} />
            </Link>
          </div>
        </div>
      </nav>

      <Sidebar />
      <DesktopHeader pathname={pathname} selfUsername={SELF_USERNAME} selfName={SELF_NAME} />

      {/* Fixed positioning throughout (sidebar, header, mobile bars) means
          this wrapper only ever needs padding, never flex, to make room for
          them — see the body comment in layout.tsx for why flex is off the
          table here. */}
      <div className="content-shell md:pl-[var(--sidebar-width)] md:pt-16">{children}</div>

      {/* Floating create button — mobile only, matches the X compose-button
          reference exactly. Sits above the bottom tab bar. */}
      <Link
        href="/rooms/create"
        aria-label="Create room"
        className="fixed bottom-20 right-5 z-10 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-medium text-white transition-transform duration-150 ease-out active:scale-[0.94] md:hidden"
        style={{
          background: "var(--rival-blue)",
          boxShadow: "0 6px 16px -4px rgba(61, 107, 255, 0.55)",
        }}
      >
        +
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
                style={{ color: active ? "var(--foreground)" : "var(--muted)" }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: active ? "var(--rival-blue)" : "transparent" }}
                />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
