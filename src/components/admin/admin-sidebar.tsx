"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { adminLogout } from "@/app/admin/login/actions";

// The admin navigation, grouped the way operators think: what's happening,
// the people, the rooms, the matches behind them, the money, settlement,
// moderation, analytics, the system, and settings.

type Item = { label: string; href: string };
const NAV: { group: string; items: Item[] }[] = [
  { group: "Overview", items: [
    { label: "Dashboard", href: "/admin" },
    { label: "Live activity", href: "/admin/live" },
  ] },
  { group: "Users", items: [
    { label: "All users", href: "/admin/users" },
    { label: "Risk & flags", href: "/admin/users?filter=flagged" },
    { label: "Reported", href: "/admin/users?filter=reported" },
    { label: "Suspended", href: "/admin/users?filter=suspended" },
  ] },
  { group: "Rooms", items: [
    { label: "All rooms", href: "/admin/rooms" },
    { label: "Live", href: "/admin/rooms?state=live" },
    { label: "Awaiting / settling", href: "/admin/rooms?state=pending" },
    { label: "Stuck", href: "/admin/rooms?state=stuck" },
    { label: "Settled", href: "/admin/rooms?state=settled" },
  ] },
  { group: "Matches", items: [
    { label: "With rooms", href: "/admin/matches" },
    { label: "Live now", href: "/admin/matches?view=live" },
    { label: "Data problems", href: "/admin/matches?view=problems" },
    { label: "Providers", href: "/admin/system?tab=providers" },
  ] },
  { group: "Finance", items: [
    { label: "Overview", href: "/admin/finance" },
    { label: "Transactions", href: "/admin/finance?tab=transactions" },
    { label: "Stakes & pools", href: "/admin/finance?tab=stakes" },
    { label: "Payouts", href: "/admin/finance?tab=payouts" },
    { label: "Fees & revenue", href: "/admin/finance?tab=fees" },
    { label: "Failed", href: "/admin/finance?tab=failed" },
  ] },
  { group: "Settlement", items: [
    { label: "Queue", href: "/admin/settlement" },
    { label: "History", href: "/admin/settlement?tab=history" },
    { label: "Failed", href: "/admin/settlement?tab=failed" },
    { label: "How results are verified", href: "/admin/settlement?tab=trustflow" },
  ] },
  { group: "Moderation", items: [
    { label: "Reports", href: "/admin/moderation" },
    { label: "Removed content", href: "/admin/moderation?tab=removed" },
    { label: "Suspensions & bans", href: "/admin/moderation?tab=restricted" },
    { label: "History", href: "/admin/moderation?tab=history" },
  ] },
  { group: "Analytics", items: [
    { label: "Traffic & sources", href: "/admin/analytics?tab=traffic" },
    { label: "Product funnels", href: "/admin/analytics?tab=product" },
    { label: "Growth", href: "/admin/analytics?tab=growth" },
    { label: "Engagement & retention", href: "/admin/analytics?tab=engagement" },
    { label: "Rooms & predictions", href: "/admin/analytics?tab=rooms" },
    { label: "Revenue", href: "/admin/analytics?tab=revenue" },
    { label: "Social / Arena", href: "/admin/analytics?tab=social" },
    { label: "Funnels", href: "/admin/analytics?tab=funnels" },
  ] },
  { group: "Data (B2B)", items: [
    { label: "Catalog & preview", href: "/admin/data" },
    { label: "Exports", href: "/admin/data?tab=exports" },
    { label: "Partners & keys", href: "/admin/data?tab=partners" },
    { label: "Usage", href: "/admin/data?tab=usage" },
    { label: "API docs", href: "/admin/data?tab=docs" },
  ] },
  { group: "System", items: [
    { label: "Health", href: "/admin/system" },
    { label: "Jobs & workers", href: "/admin/system?tab=jobs" },
    { label: "Errors", href: "/admin/system?tab=errors" },
    { label: "Audit log", href: "/admin/system?tab=audit" },
  ] },
  { group: "Settings", items: [
    { label: "Fees & limits", href: "/admin/settings" },
    { label: "Feature flags", href: "/admin/settings?tab=flags" },
    { label: "Admins", href: "/admin/settings?tab=admins" },
  ] },
];

function isActive(href: string, pathname: string, search: URLSearchParams): boolean {
  const [path, query] = href.split("?");
  if (path !== pathname) return false;
  const want = new URLSearchParams(query ?? "");
  const keys = ["tab", "state", "view", "filter"];
  return keys.every((k) => (want.get(k) ?? "") === (search.get(k) ?? ""));
}

export function AdminSidebar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-5 px-3 pb-10 pt-4">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="px-2 pb-1.5 text-caption font-semibold uppercase text-secondary">{g.group}</p>
          {g.items.map((it) => {
            const on = isActive(it.href, pathname, search);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="block rounded-control px-2 py-1.5 text-label transition-colors"
                style={on ? { background: "var(--surface-elevated)", color: "var(--foreground)", fontWeight: 600 } : { color: "var(--text-secondary)" }}
              >
                {it.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-line bg-background/95 px-4 backdrop-blur-sm lg:pl-[248px]">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-label text-secondary lg:hidden" aria-label="Menu">
            Menu
          </button>
          <span className="font-display text-body font-bold tracking-tight text-foreground lg:hidden">Rivaly Ops</span>
        </div>
        <div className="flex items-center gap-4 text-caption text-secondary">
          <span>
            {name} · <span className="text-foreground">{role}</span>
          </span>
          <Link href="/" className="hover:text-foreground">
            Back to app
          </Link>
          <form action={adminLogout}>
            <button className="hover:text-foreground">Sign out</button>
          </form>
        </div>
      </header>
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[232px] overflow-y-auto border-r border-line bg-surface lg:block">
        <div className="flex h-12 items-center border-b border-line px-5">
          <span className="font-display text-body font-bold tracking-tight text-foreground">Rivaly Ops</span>
        </div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute bottom-0 left-0 top-0 w-[260px] overflow-y-auto bg-surface">{nav}</aside>
        </div>
      )}
    </>
  );
}
