"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./avatar";
import { ThemeToggle } from "./theme-toggle";
import { TopBarIcons } from "./top-bar-icons";

// V1 sitemap only — see docs/masterplan/08-v1-scope.md. Do not add links for
// Communities, Streaming, Tournaments, etc. until V1 scope changes.
//
// Two physical navs, not one responsive one: 95% of the target audience is
// mobile (docs/masterplan/09-competitive-research.md#1), so mobile gets a
// real bottom tab bar — the one-handed pattern the research calls for —
// rather than a squeezed-down version of the desktop link row.
const links = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/following", label: "Following" },
  { href: "/wallet", label: "Wallet" },
];

// No Create tab here — the floating + (X's compose-button pattern) is the
// one entry point on mobile, matching the reference video. Desktop keeps an
// explicit "Create room" button since there's no FAB there.
const tabs = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/following", label: "Following" },
  { href: "/wallet", label: "Wallet" },
];

// The self-profile stand-in until auth exists — see src/lib/mock-data.ts.
const SELF_USERNAME = "victorj";
const SELF_NAME = "Victor";

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 md:gap-6 md:px-6">
          <Link href="/" className="font-display text-base font-bold tracking-tight text-foreground md:text-lg">
            Rivaly
          </Link>

          <div className="hidden flex-1 items-center gap-6 text-sm md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative py-1 transition-colors duration-150"
                  style={{ color: active ? "var(--foreground)" : "var(--muted)" }}
                >
                  {link.label}
                  {active && (
                    <span
                      className="absolute -bottom-[17px] left-0 right-0 h-[2px]"
                      style={{ background: "var(--foreground)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <Link
            href="/rooms/create"
            className="hidden shrink-0 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] md:inline-block"
          >
            Create room
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-2.5 md:ml-0 md:gap-4">
            <TopBarIcons />
            <ThemeToggle />
            <Link href={`/profile/${SELF_USERNAME}`} className="shrink-0">
              <Avatar name={SELF_NAME} size={32} />
            </Link>
          </div>
        </div>
      </nav>

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
