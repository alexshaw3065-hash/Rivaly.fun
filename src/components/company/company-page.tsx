import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/seo/site-footer";
import { buttonClasses } from "@/components/ui/button";
import { COMPANY, COMPANY_PAGES, mailto } from "@/lib/company";
import { CompanyTabs } from "./company-tabs";
import { CheckCircleIcon, ChevronRightIcon, HeartIcon, InfoCircleIcon, MailIcon, PAGE_ICONS } from "./company-icons";

// The one layout every company page uses — About, How it works, Support,
// Responsible play, Terms, Privacy — so they read as one help center, the way
// Polymarket's does: a branded header band with breadcrumbs, a contents list
// (sticky beside the text on desktop, folded at the top on a phone),
// numbered, linkable sections, real bullets, call-outs for what matters, and
// cards to the rest of the help center at the bottom. All server rendered:
// AI crawlers and search engines read the full text.

export type TocItem = { id: string; label: string };

export function CompanyPage({
  active,
  title,
  lede,
  meta,
  toc,
  band,
  children,
  contactLine = "Still have a question?",
}: {
  active: string;
  title: string;
  lede: ReactNode;
  meta?: ReactNode;
  toc?: TocItem[];
  /** Extra content inside the header band (Support's search). */
  band?: ReactNode;
  children: ReactNode;
  /** null hides the contact card (a page with its own). */
  contactLine?: string | null;
}) {
  const page = COMPANY_PAGES.find((p) => p.href === active);
  const Icon = PAGE_ICONS[active];
  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 pb-12 pt-3 md:px-6 md:pt-8">
      <CompanyTabs active={active} />

      <header className="relative mt-5 overflow-hidden rounded-card bg-yes px-5 pb-8 pt-6 text-white md:mt-8 md:px-10 md:pb-12 md:pt-8">
        {/* Rivaly's seam — the hard diagonal of the YES/NO split bar — as a
            darker plane across the band. */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-3/5 bg-black/15 [clip-path:polygon(34%_0,100%_0,100%_100%,0_100%)]" />
        {active !== "/support" && (
          <nav aria-label="Breadcrumb" className="relative mb-6 flex items-center gap-2 text-caption text-white/75 md:mb-8">
            <Link href="/support" className="hover:text-white">
              Help center
            </Link>
            {page && (
              <>
                <ChevronRightIcon className="h-2.5 w-1.5" />
                <span>{page.section}</span>
              </>
            )}
          </nav>
        )}
        <div className={`relative flex items-center gap-3 ${active === "/support" ? "mt-2" : ""}`}>
          {Icon && <Icon className="h-7 w-7 shrink-0 md:h-8 md:w-8" />}
          <h1 className="font-display text-title-1 md:text-display">{title}</h1>
        </div>
        <div className="relative mt-3 max-w-2xl text-body-lg text-white/85">{lede}</div>
        {meta && <p className="relative mt-4 text-caption text-white/70">{meta}</p>}
        {band && <div className="relative mt-6">{band}</div>}
      </header>

      <div className={`mt-10 md:mt-12 ${toc ? "lg:grid lg:grid-cols-[192px_minmax(0,1fr)] lg:gap-16" : ""}`}>
        {toc && (
          <aside className="hidden lg:block" aria-label="On this page">
            <nav className="sticky top-[calc(var(--header-height)+32px)]">
              <p className="text-caption font-semibold text-tertiary">On this page</p>
              <ol className="mt-3 flex flex-col gap-2 border-l border-line">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="-ml-px block border-l border-transparent pl-3 text-caption text-secondary transition-colors duration-100 hover:border-yes hover:text-foreground">
                      {t.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        )}

        <div className="min-w-0 max-w-2xl">
          {toc && (
            <details className="group mb-10 rounded-card bg-surface edge lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-label font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                Table of contents
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="text-tertiary transition-transform duration-150 group-open:rotate-180">
                  <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <ol className="flex flex-col border-t border-line px-4 py-2">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="block py-2 text-body text-secondary">
                      {t.label}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )}

          <div className="flex flex-col gap-12">{children}</div>

          {contactLine !== null && (
            <section aria-label="Contact" className="mt-14 flex flex-col gap-4 rounded-card bg-surface p-5 edge sm:flex-row sm:items-center sm:justify-between md:p-6">
              <div className="flex gap-3">
                <MailIcon className="mt-0.5 h-5 w-5 shrink-0 text-yes-ink" />
                <div>
                  <p className="font-semibold text-foreground">{contactLine}</p>
                  <p className="mt-0.5 text-caption text-secondary">A real person reads every message.</p>
                </div>
              </div>
              <a href={mailto()} className={buttonClasses({ variant: "secondary", size: "md", className: "shrink-0" })}>
                {COMPANY.email}
              </a>
            </section>
          )}
        </div>
      </div>

      <KeepReading active={active} />

      <SiteFooter />
    </main>
  );
}

/** Cards to the rest of the help center — Polymarket's collection cards. */
export function HelpCards({ exclude, className = "" }: { exclude?: string; className?: string }) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {COMPANY_PAGES.filter((p) => p.href !== exclude).map((p) => {
        const Icon = PAGE_ICONS[p.href];
        return (
          <li key={p.href}>
            <Link href={p.href} className="press-row group flex h-full items-start gap-3 rounded-card bg-surface p-4 edge transition-colors duration-100 hover:bg-surface-elevated">
              {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0 text-yes-ink" />}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">{p.title}</span>
                <span className="mt-1 block text-caption text-secondary">{p.blurb}</span>
              </span>
              <ChevronRightIcon className="mt-1.5 h-3 w-2 shrink-0 text-tertiary transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function KeepReading({ active }: { active: string }) {
  return (
    <section aria-labelledby="keep-reading" className="mt-16">
      <h2 id="keep-reading" className="font-display text-title-3 text-foreground">
        Keep reading
      </h2>
      <HelpCards exclude={active} className="mt-4" />
    </section>
  );
}

/** A numbered, linkable section of a document. */
export function DocSection({ id, n, title, children }: { id: string; n?: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--header-height)+24px)]">
      <h2 className="flex items-baseline gap-3 font-display text-title-3 text-foreground">
        {n !== undefined && <span className="w-6 shrink-0 tabular-nums text-yes-ink">{n}</span>}
        <a href={`#${id}`} className="hover:underline hover:decoration-line-strong hover:underline-offset-4">
          {title}
        </a>
      </h2>
      <div
        className={`mt-3 flex flex-col gap-4 text-body leading-7 text-foreground/80 [&_a]:font-medium [&_a]:text-yes-ink [&_a]:underline [&_a]:decoration-yes/40 [&_a]:underline-offset-4 [&_a:hover]:decoration-yes [&_strong]:font-semibold [&_strong]:text-foreground ${n !== undefined ? "md:pl-9" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

/** A bulleted list inside a section. */
export function DocList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-yes">
      {items.map((item, i) => (
        <li key={i} className="pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

const CALLOUT = {
  info: { box: "bg-yes-tint", ink: "text-yes-ink", Icon: InfoCircleIcon },
  good: { box: "bg-money-tint", ink: "text-money-ink", Icon: CheckCircleIcon },
  care: { box: "bg-no-tint", ink: "text-no-ink", Icon: HeartIcon },
} as const;

/** A highlighted note — the beta, a promise, where to get help now. */
export function Callout({ tone = "info", title, children }: { tone?: keyof typeof CALLOUT; title: ReactNode; children?: ReactNode }) {
  const c = CALLOUT[tone];
  return (
    <div className={`flex gap-3 rounded-card p-4 ${c.box}`}>
      <c.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${c.ink}`} />
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        {children && <div className="mt-1 text-foreground/80">{children}</div>}
      </div>
    </div>
  );
}

/**
 * The plain-English version at the top of a legal page: the handful of
 * things that matter most, each linking to the section that says it
 * properly. The full text still governs.
 */
export function PlainSummary({ title = "The short version", items, note }: { title?: string; items: { text: ReactNode; href: string }[]; note?: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-card bg-surface p-5 edge md:p-6">
      <h2 className="font-display text-title-3 text-foreground">{title}</h2>
      <ul className="mt-4 flex flex-col">
        {items.map((it, i) => (
          <li key={i} className="border-t border-line first:border-0">
            <a href={it.href} className="group flex gap-3 py-3 text-body text-foreground/85 transition-colors duration-100 hover:text-foreground">
              <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-money-ink" />
              <span className="min-w-0 flex-1">{it.text}</span>
              <ChevronRightIcon className="mt-1.5 h-3 w-2 shrink-0 text-tertiary opacity-0 transition-opacity duration-100 group-hover:opacity-100" />
            </a>
          </li>
        ))}
      </ul>
      {note && <p className="mt-3 text-caption text-tertiary">{note}</p>}
    </section>
  );
}
