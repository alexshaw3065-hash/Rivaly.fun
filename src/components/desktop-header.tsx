import Link from "next/link";
import { SearchIcon } from "./icons";
import { TopBarIcons } from "./top-bar-icons";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./avatar";

// Desktop-only (hidden md:flex) top bar, offset by the sidebar's current
// width (see .header-shell in globals.css) — fixed positioned, not a flex
// sibling of <main>, for the same reason as sidebar.tsx. Search bar styled
// after the founder's Polymarket reference: dark rounded pill, leading
// glass icon, trailing "/" keybind hint, no live results dropdown (this is
// still a Link into /search, not a real inline search — see search-bar-link.tsx
// for why Home takes the same shortcut approach on mobile). Suppressed on
// /search itself, where the real functional search input already lives in
// the page — two stacked search bars would fight for the same job.
export function DesktopHeader({
  pathname,
  selfUsername,
  selfName,
}: {
  pathname: string;
  selfUsername: string;
  selfName: string;
}) {
  return (
    <header className="header-shell fixed inset-x-0 top-0 z-20 hidden h-16 items-center border-b border-border bg-background/95 backdrop-blur-sm md:flex">
      <div className="flex w-full items-center gap-6 px-6">
        {pathname !== "/search" && (
          <Link
            href="/search"
            className="hover-border flex w-full max-w-md items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-muted transition-colors"
          >
            <SearchIcon />
            <span className="flex-1 truncate">Search rooms, matches, people…</span>
            <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted">
              /
            </span>
          </Link>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-4">
          <TopBarIcons />
          <ThemeToggle />
          <Link href={`/profile/${selfUsername}`} className="shrink-0">
            <Avatar name={selfName} size={32} />
          </Link>
        </div>
      </div>
    </header>
  );
}
