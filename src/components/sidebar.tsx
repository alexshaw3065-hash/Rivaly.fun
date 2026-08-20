"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SearchIcon, RoomsIcon, ArenaIcon, ChevronIcon } from "./icons";
import { Avatar } from "./avatar";
import { useSidebarCollapsed, setSidebarCollapsed } from "@/lib/use-sidebar-collapsed";

// The self-profile stand-in until auth exists — see src/lib/mock-data.ts.
const SELF_USERNAME = "victorj";
const SELF_NAME = "Victor";

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
// "this one is you" convention the mobile top bar already uses.
const links = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/search", label: "Search", Icon: SearchIcon },
  { href: "/rooms", label: "Rooms", Icon: RoomsIcon },
  { href: "/arena", label: "Arena", Icon: ArenaIcon },
  { href: `/profile/${SELF_USERNAME}`, label: "Profile", Icon: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();

  return (
    <aside
      className="sidebar-shell fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-border bg-background md:flex"
      aria-label="Primary"
    >
      <Link href="/" className="flex shrink-0 items-center px-5 py-5">
        <span className="font-display text-lg font-bold tracking-tight text-foreground">
          {collapsed ? "R" : "Rivaly"}
        </span>
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
                {Icon ? <Icon /> : <Avatar name={SELF_NAME} size={18} />}
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
