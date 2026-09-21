import Link from "next/link";
import { TopBarIcons } from "./top-bar-icons";
import { ThemeToggle } from "./theme-toggle";
import { DesktopAccountMenu } from "./desktop-account-menu";
import { DesktopSearchBox } from "./desktop-search-box";
import { openAuthModal } from "@/lib/auth-modal-store";

// Desktop-only (hidden md:flex) top bar, offset by the sidebar's current
// width (see .header-shell in globals.css) — fixed positioned, not a flex
// sibling of <main>, for the same reason as sidebar.tsx. Search bar is a
// real inline combobox (DesktopSearchBox) styled after the founder's
// Polymarket reference: dark rounded pill, leading glass icon, trailing
// "/" keybind hint, dropdown with live results — not just a Link into
// /search. Suppressed on /search itself, where the same search experience
// already lives in the page at full size — two stacked search boxes would
// fight for the same job.
//
// "Create room" lives here, not the sidebar — the sidebar is pure nav
// (Home/Search/Following/Wallet); this is the one primary action, same
// role the old desktop top bar's button played.
export function DesktopHeader({
  pathname,
  selfUsername,
  selfName,
  selfAvatarUrl,
}: {
  pathname: string;
  selfUsername: string | null;
  selfName: string | null;
  selfAvatarUrl?: string | null;
}) {
  return (
    <header className="header-shell fixed inset-x-0 top-0 z-20 hidden h-16 items-center border-b border-border bg-background/95 backdrop-blur-sm md:flex">
      <div className="flex w-full items-center gap-6 px-6">
        {pathname !== "/search" && <DesktopSearchBox />}

        <div className="ml-auto flex shrink-0 items-center gap-5">
          <Link
            href="/rooms/create"
            className="shrink-0 rounded-md bg-foreground px-3.5 py-2 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Create room
          </Link>
          <TopBarIcons />
          <ThemeToggle />
          {selfUsername && selfName ? (
            <DesktopAccountMenu username={selfUsername} name={selfName} avatarUrl={selfAvatarUrl} />
          ) : (
            <button
              onClick={() => openAuthModal()}
              className="shrink-0 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.97]"
              style={{ background: "var(--rival-blue)" }}
            >
              Sign up
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
