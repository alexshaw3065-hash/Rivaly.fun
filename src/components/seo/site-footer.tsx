import Link from "next/link";
import { SOCIALS } from "@/lib/socials";

// The way out to everything a first-time visitor (or a search engine / AI
// crawler) might want next, plus the one-line definition of Rivaly in plain
// server-rendered text. Shown on signed-out Home, About and the guide.
export function SiteFooter() {
  const links = [
    { href: "/about", label: "About Rivaly" },
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
      <p className="mt-3">Rivaly — social prediction for sport. Play people, never the house.</p>
    </footer>
  );
}
