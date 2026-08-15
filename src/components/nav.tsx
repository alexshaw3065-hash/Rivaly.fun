"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "./avatar";

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

const tabs = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/rooms/create", label: "Create" },
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
        <div className="mx-auto flex max-w-5xl items-center gap-8 px-6 py-4">
          <Link href="/" className="font-display text-lg font-bold tracking-tight text-foreground">
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

          <Link href={`/profile/${SELF_USERNAME}`} className="ml-auto shrink-0 md:ml-0">
            <Avatar name={SELF_NAME} size={32} />
          </Link>
        </div>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            const isCreate = tab.href === "/rooms/create";
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
                style={{ color: active || isCreate ? "var(--foreground)" : "var(--muted)" }}
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
