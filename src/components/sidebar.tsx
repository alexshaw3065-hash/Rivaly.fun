"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { HomeIcon, SearchIcon, RoomsIcon, ArenaIcon, ChevronIcon, KeyIcon } from "./icons";
import { Avatar } from "./avatar";
import { useCurrentUser } from "./current-user-provider";
import { useSidebarCollapsed, setSidebarCollapsed } from "@/lib/use-sidebar-collapsed";

// Desktop-only (hidden md:flex) collapsible left rail — fixed positioned,
// deliberately not a flex sibling of <main>, so it can never reintroduce
// the body-flex overflow bug documented in layout.tsx. Expanded by default;
// state lives in the `.sidebar-collapsed` class on <html> (see
// use-sidebar-collapsed.ts) so width, icons-vs-labels, and the collapse
// arrow all read off one source of truth.
//
// Wallet's balance/deposit/withdraw now lives on Profile too (see
// profile-pnl.tsx), so this last slot points at Profile instead of the
// standalone /wallet page — the small avatar stands in for its icon, same
// "this one is you" convention the mobile top bar already uses. Built
// per-render below (not a module-level constant) now that who's signed in
// is real, not a hardcoded stand-in.
const baseLinks = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/search", label: "Search", Icon: SearchIcon },
  { href: "/rooms", label: "Rooms", Icon: RoomsIcon },
  { href: "/arena", label: "Arena", Icon: ArenaIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const currentUser = useCurrentUser();

  const links = [
    ...baseLinks,
    currentUser
      ? { href: `/profile/${currentUser.username}`, label: "Profile", Icon: null }
      : { href: "/login", label: "Sign in", Icon: null },
  ];

  return (
    <aside
      className="sidebar-shell fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border bg-background md:flex"
      aria-label="Primary"
    >
      <Link href="/" className="flex shrink-0 items-center px-5 py-5">
        {collapsed ? (
          <span className="font-display text-lg font-bold tracking-tight text-foreground">R</span>
        ) : (
          <Image
            src="/rivaly-logo.png"
            alt="Rivaly"
            width={160}
            height={64}
            priority
            className="brand-logo h-8 w-auto"
          />
        )}
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {links.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150"
              style={{
                color: active ? "var(--foreground)" : "var(--muted)",
                background: active ? "var(--surface)" : "transparent",
              }}
            >
              <span className="shrink-0">
                {Icon ? (
                  <Icon />
                ) : currentUser ? (
                  <Avatar name={currentUser.displayName} size={18} />
                ) : (
                  <KeyIcon />
                )}
              </span>
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 px-3 pb-5">
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-muted transition-colors duration-150 hover:text-foreground"
        >
          <span className="shrink-0" style={{ transform: collapsed ? "rotate(180deg)" : "none" }}>
            <ChevronIcon />
          </span>
          {!collapsed && <span className="truncate text-sm font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
