"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { HomeIcon, SearchIcon, ColosseumIcon, ChevronIcon, PersonIcon, XIcon, TiktokIcon, LinkedInIcon } from "./icons";
import { RivalyMark } from "./rivaly-wordmark";
import { SOCIALS } from "@/lib/socials";
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
// Same icons as the mobile tab bar: Rooms wears the Rivaly mark (greyed until
// active), Arena is the Colosseum.
const baseLinks = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/search", label: "Search", Icon: SearchIcon },
  { href: "/rooms", label: "Rooms", Icon: null, mark: true },
  { href: "/arena", label: "Arena", Icon: ColosseumIcon },
];

const SOCIAL_ICONS = { x: XIcon, tiktok: TiktokIcon, linkedin: LinkedInIcon } as const;

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const currentUser = useCurrentUser();

  const links = [
    ...baseLinks,
    currentUser
      ? { href: `/profile/${currentUser.username}`, label: "Profile", Icon: null, mark: false }
      : { href: "/login", label: "Sign in", Icon: PersonIcon, mark: false },
  ];

  return (
    <aside
      className="sidebar-shell fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-line bg-background md:flex"
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
        {links.map(({ href, label, Icon, mark }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex h-10 items-center gap-3 rounded-control px-3 text-label transition-colors duration-100 ${active ? "bg-surface text-foreground" : "text-secondary hover:bg-overlay-1 hover:text-foreground"}`}
            >
              <span className="shrink-0">
                {mark ? (
                  <span className="flex h-[19px] w-[19px] items-center justify-center">
                    <RivalyMark height={14} muted={!active} />
                  </span>
                ) : Icon ? (
                  <Icon />
                ) : currentUser ? (
                  <Avatar name={currentUser.displayName} size={18} imageUrl={currentUser.avatarUrl} />
                ) : null}
              </span>
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="flex shrink-0 items-center gap-1 px-4 pb-2">
          {SOCIALS.map(({ key, label, href }) => {
            const SocialIcon = SOCIAL_ICONS[key];
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Rivaly on ${label}`}
                title={`Rivaly on ${label}`}
                className="flex h-9 w-9 items-center justify-center rounded-control text-secondary transition-colors duration-100 hover:bg-overlay-1 hover:text-foreground [&>svg]:h-[18px] [&>svg]:w-[18px]"
              >
                <SocialIcon />
              </a>
            );
          })}
        </div>
      )}

      <div className="shrink-0 px-3 pb-5">
        <button
          onClick={() => setSidebarCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-10 w-full items-center gap-3 rounded-control px-3 text-secondary transition-colors duration-100 hover:text-foreground"
        >
          <span className="shrink-0" style={{ transform: collapsed ? "rotate(180deg)" : "none" }}>
            <ChevronIcon />
          </span>
          {!collapsed && <span className="truncate text-label">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
