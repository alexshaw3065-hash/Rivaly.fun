import Link from "next/link";

// V1 sitemap only — see docs/masterplan/08-v1-scope.md. Do not add links for
// Communities, Streaming, Tournaments, etc. until V1 scope changes.
const links = [
  { href: "/", label: "Home" },
  { href: "/rooms/create", label: "Create Room" },
  { href: "/search", label: "Search" },
  { href: "/following", label: "Following" },
  { href: "/wallet", label: "Wallet" },
];

export function Nav() {
  return (
    <nav className="flex items-center gap-6 border-b border-border px-6 py-4">
      <Link href="/" className="font-semibold tracking-tight">
        Rivaly
      </Link>
      <div className="flex gap-4 text-sm text-muted">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
