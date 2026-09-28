import Link from "next/link";
import { SOCIALS } from "@/lib/socials";

// Shown on Home to signed-out visitors only — which is also everyone a search
// engine or AI assistant sends. The rest of Home fills in from the browser,
// so without this the page reads as a menu and nothing else. One heading and
// one sentence: what Rivaly is, in five seconds, then straight into the rooms.
export function HomeIntro() {
  return (
    <header className="mb-6 md:mb-8">
      <h1 className="font-display text-title-1 text-foreground">Your football opinion vs theirs.</h1>
      <p className="mt-2 max-w-2xl text-body text-secondary">
        Rivaly is the social prediction market for football. Make a call on a match, challenge the people who disagree,
        watch it together, and the winner is paid automatically — you play people, never the house.{" "}
        <Link href="/docs" className="font-semibold text-foreground hover:underline">
          How it works
        </Link>
      </p>
    </header>
  );
}

// The page's way out to everything a first-time visitor (or crawler) might
// want next. Plain text links, no chrome.
export function SiteFooter() {
  const links = [
    { href: "/docs", label: "How Rivaly works" },
    { href: "/rooms", label: "Rooms" },
    { href: "/arena", label: "Arena" },
    { href: "/support", label: "Support" },
    { href: "/terms", label: "Terms" },
  ];
  return (
    <footer className="mt-12 border-t border-line pt-6 pb-4 text-caption text-tertiary">
      <nav aria-label="Site" className="flex flex-wrap gap-x-5 gap-y-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-secondary">
            {l.label}
          </Link>
        ))}
        {SOCIALS.map((s) => (
          <a key={s.key} href={s.href} rel="me noopener" target="_blank" className="hover:text-secondary">
            {s.label}
          </a>
        ))}
      </nav>
      <p className="mt-3">Rivaly — the social prediction market for football. Predict against people, never the house.</p>
    </footer>
  );
}
