import type { ReactNode } from "react";
import { SiteFooter } from "@/components/seo/site-footer";
import { COMPANY, mailto } from "@/lib/company";
import { CompanyTabs } from "./company-tabs";

// The one layout every company page uses — About, How it works, Support,
// Responsible play, Terms, Privacy — so they read as one documented company,
// not six one-off pages. A tab strip ties them together; long pages get a
// contents list (sticky beside the text on desktop, folded at the top on a
// phone); every section is a numbered anchor you can link to. All server
// rendered: AI crawlers and search engines read the full text.

export type TocItem = { id: string; label: string };

export function CompanyPage({
  active,
  title,
  lede,
  meta,
  toc,
  children,
  contactLine = "Questions about anything here?",
}: {
  active: string;
  title: string;
  lede: ReactNode;
  meta?: ReactNode;
  toc?: TocItem[];
  children: ReactNode;
  /** null hides it (a page with its own contact section). */
  contactLine?: string | null;
}) {
  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 pb-12 pt-3 md:px-6 md:pt-8">
      <CompanyTabs active={active} />

      <header className="mt-8 max-w-2xl md:mt-12">
        <h1 className="font-display text-title-1 text-foreground md:text-display">{title}</h1>
        <div className="mt-4 text-body-lg text-secondary">{lede}</div>
        {meta && <p className="mt-4 text-caption text-tertiary">{meta}</p>}
      </header>

      <div className={`mt-10 md:mt-12 ${toc ? "lg:grid lg:grid-cols-[192px_minmax(0,1fr)] lg:gap-16" : ""}`}>
        {toc && (
          <aside className="hidden lg:block" aria-label="On this page">
            <nav className="sticky top-[calc(var(--header-height)+32px)]">
              <p className="text-caption font-semibold text-tertiary">On this page</p>
              <ol className="mt-3 flex flex-col gap-2">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="block text-caption text-secondary transition-colors duration-100 hover:text-foreground">
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
                On this page
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
            <p className="mt-14 border-t border-line pt-6 text-body text-secondary">
              {contactLine}{" "}
              <a href={mailto()} className="font-semibold text-foreground underline-offset-4 hover:underline">
                {COMPANY.email}
              </a>
            </p>
          )}
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

/** A numbered, linkable section of a document. */
export function DocSection({ id, n, title, children }: { id: string; n?: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--header-height)+24px)]">
      <h2 className="flex items-baseline gap-3 font-display text-title-3 text-foreground">
        {n !== undefined && <span className="w-6 shrink-0 tabular-nums text-tertiary">{n}</span>}
        <a href={`#${id}`} className="hover:underline hover:decoration-line-strong hover:underline-offset-4">
          {title}
        </a>
      </h2>
      <div className={`mt-3 flex flex-col gap-3 text-body text-secondary [&_a]:text-foreground [&_a]:underline [&_a]:decoration-line-strong [&_a]:underline-offset-4 [&_a:hover]:decoration-foreground [&_strong]:font-semibold [&_strong]:text-foreground ${n !== undefined ? "md:pl-9" : ""}`}>
        {children}
      </div>
    </section>
  );
}

/** A plain list inside a section: hairline-marked, not bullets. */
export function DocList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-line-strong" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
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
      <h2 className="text-label font-semibold text-foreground">{title}</h2>
      <ol className="mt-4 flex flex-col">
        {items.map((it, i) => (
          <li key={i} className="border-t border-line first:border-0">
            <a href={it.href} className="group flex gap-3 py-3 text-body text-secondary transition-colors duration-100 hover:text-foreground">
              <span className="w-5 shrink-0 tabular-nums text-tertiary">{i + 1}</span>
              <span className="min-w-0 flex-1">{it.text}</span>
            </a>
          </li>
        ))}
      </ol>
      {note && <p className="mt-3 text-caption text-tertiary">{note}</p>}
    </section>
  );
}
