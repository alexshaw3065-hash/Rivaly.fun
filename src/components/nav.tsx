"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AppPreloader } from "./app-preloader";
import { usePathname } from "next/navigation";
import { RivalyWordmark } from "./rivaly-wordmark";
import { TopBarIcons } from "./top-bar-icons";
import { MobileMoreMenu } from "./mobile-more-menu";
import { Sidebar } from "./sidebar";
import { DesktopHeader } from "./desktop-header";
import { MobileSearchOverlay } from "./mobile-search-overlay";
import { QuickDepositSheet } from "./quick-deposit-sheet";
import { StreakTracker } from "./streak-tracker";
import { useCurrentUser } from "./current-user-provider";
import { useSearchOverlayOpen, openSearchOverlay } from "@/lib/search-overlay-store";
import { openArenaComposer } from "@/lib/arena/composer-store";
import { openAuthModal } from "@/lib/auth-modal-store";
import { ArenaComposerHost } from "./arena/arena-composer-host";

// V1 sitemap only — see docs/masterplan/08-v1-scope.md. Do not add links for
// Communities, Streaming, Tournaments, etc. until V1 scope changes.
//
// Two physically different navs, not one responsive one: 95% of the target
// audience is mobile (docs/masterplan/09-competitive-research.md#1), so
// mobile keeps its own top bar + bottom tab bar (the one-handed pattern the
// research calls for) untouched, while desktop gets a collapsible left
// sidebar + top header (sidebar.tsx, desktop-header.tsx) per the founder's
// Polymarket-style direction — not a squeezed-down version of the mobile bar.

// Wallet's balance/deposit/withdraw now lives on Profile too (see
// profile-pnl.tsx), so the bottom-nav slot points there instead of at the
// standalone /wallet page — Profile is the one place to reach both your
// identity and your money from nav. /wallet itself still exists as a route.
// The Profile tab's href/label are built per-render below now that who's
// signed in is real (useCurrentUser()), not a hardcoded stand-in — signed
// out, it points at /login instead of a profile that doesn't exist yet.
const baseTabs = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/rooms", label: "Rooms" },
  { href: "/arena", label: "Arena" },
];

export function Nav({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchOpen = useSearchOverlayOpen();
  const currentUser = useCurrentUser();

  const tabs = [
    ...baseTabs,
    currentUser
      ? { href: `/profile/${currentUser.username}`, label: "Profile" }
      : { href: "/login", label: "Sign in" },
  ];

  return (
    <>
      {/* Mobile top bar — md:hidden, unaffected by the search overlay (it's
          a fixed sheet layered on top, not a route change — see
          mobile-search-overlay.tsx). */}
      <nav className="mobile-topbar sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm md:hidden">
        <div className="flex items-center gap-3 py-4 pl-6 pr-4">
          <Link href="/" className="shrink-0">
            <RivalyWordmark />
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <TopBarIcons walletBordered />
            <MobileMoreMenu />
          </div>
        </div>
      </nav>

      <Sidebar />
      <DesktopHeader
        pathname={pathname}
        selfUsername={currentUser?.username ?? null}
        selfName={currentUser?.displayName ?? null}
        selfAvatarUrl={currentUser?.avatarUrl}
      />
      <MobileSearchOverlay />
      <QuickDepositSheet />
      <StreakTracker />
      <AppPreloader />
      <ArenaComposerHost />

      {/* Fixed positioning throughout (sidebar, header, mobile bars) means
          this wrapper only ever needs padding, never flex, to make room for
          them — see the body comment in layout.tsx for why flex is off the
          table here. */}
      <div className="content-shell md:pl-[var(--sidebar-width)] md:pt-16">{children}</div>

      {/* Floating create button — mobile only, matches the X compose-button
          reference exactly. Sits above the bottom tab bar. Hidden inside a
          room and on the create page, where the page's own primary action
          (join / throw down) is the one thing to press and the "+" would
          only sit on top of it. */}
      {/* On the Arena the same button posts a take — one primary action per
          screen (arena-feed.tsx listens for the event). */}
      {pathname === "/arena" && (
        <button
          type="button"
          onClick={() => (currentUser ? openArenaComposer() : openAuthModal({ next: "/arena" }))}
          aria-label="Post a take"
          className="arena-fab fixed bottom-20 right-5 z-10 flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform duration-150 ease-out active:scale-[0.94] md:hidden"
          style={{ background: "var(--rival-blue)", boxShadow: "0 6px 16px -4px rgba(61, 107, 255, 0.55)" }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <path d="M4 18l1-4L14.5 4.5a2.1 2.1 0 0 1 3 3L8 17l-4 1Z" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {!pathname.startsWith("/rooms/") && pathname !== "/arena" && (
        <Link
          href="/rooms/create"
          prefetch
          aria-label="Create room"
          className="fixed bottom-20 right-5 z-10 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-medium text-white transition-transform duration-150 ease-out active:scale-[0.94] md:hidden"
          style={{
            background: "var(--rival-blue)",
            boxShadow: "0 6px 16px -4px rgba(61, 107, 255, 0.55)",
          }}
        >
          +
        </Link>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          {tabs.map((tab) => {
            const isSearch = tab.href === "/search";
            const active = isSearch ? searchOpen || pathname === "/search" : pathname === tab.href;
            const dot = (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: active ? "var(--rival-blue)" : "transparent" }}
              />
            );
            // Search opens the overlay in place (mobile-search-overlay.tsx)
            // instead of navigating — that's what lets dismissing it drop
            // you back exactly where you were, on whatever page/tab you
            // were already looking at.
            if (isSearch) {
              return (
                <button
                  key={tab.href}
                  onClick={openSearchOverlay}
                  className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
                  style={{ color: active ? "var(--foreground)" : "var(--muted)" }}
                >
                  {dot}
                  {tab.label}
                </button>
              );
            }
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
                style={{ color: active ? "var(--foreground)" : "var(--muted)" }}
              >
                {dot}
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
