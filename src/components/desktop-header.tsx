import { TopBarIcons } from "./top-bar-icons";
import { ThemeToggle } from "./theme-toggle";
import { DesktopAccountMenu } from "./desktop-account-menu";
import { DesktopSearchBox } from "./desktop-search-box";
import { openAuthModal } from "@/lib/auth-modal-store";
import { openHowItWorks } from "@/lib/how-it-works-store";
import { Button, ButtonLink } from "./ui/button";

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
    <header className="header-shell fixed inset-x-0 top-0 z-20 hidden h-16 items-center border-b border-line bg-background/95 backdrop-blur-sm md:flex">
      <div className="flex w-full items-center gap-6 px-6">
        {pathname !== "/search" && <DesktopSearchBox />}

        <div className="ml-auto flex shrink-0 items-center gap-5">
          {/* New visitors' way back to the three-step intro (how-it-works.tsx). */}
          {!selfUsername && (
            <Button onClick={() => openHowItWorks("header")} variant="ghost" size="md" className="shrink-0">
              How it works
            </Button>
          )}
          <ButtonLink href="/rooms/create" prefetch variant="inverse" size="md" className="shrink-0">
            Create room
          </ButtonLink>
          <TopBarIcons />
          <ThemeToggle />
          {selfUsername && selfName ? (
            <DesktopAccountMenu username={selfUsername} name={selfName} avatarUrl={selfAvatarUrl} />
          ) : (
            <Button onClick={() => openAuthModal()} variant="primary" size="md" className="shrink-0">
              Sign up
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
