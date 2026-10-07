"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { COMPANY_TABS } from "@/lib/company";

/**
 * The strip of company pages across the top: where you are, and the rest one
 * tap away. On a phone it scrolls sideways, so it opens with the current
 * page's tab in view (Terms and Privacy sit past the edge otherwise).
 */
export function CompanyTabs({ active }: { active: string }) {
  const list = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const ul = list.current;
    const on = ul?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!ul || !on) return;
    const right = on.offsetLeft + on.offsetWidth;
    if (right > ul.clientWidth) ul.scrollLeft = right - ul.clientWidth + 16;
  }, [active]);

  return (
    <nav aria-label="Company" className="-mx-4 border-b border-line md:mx-0">
      <ul ref={list} className="no-scrollbar flex gap-6 overflow-x-auto px-4 md:px-0">
        {COMPANY_TABS.map((t) => {
          const on = t.href === active;
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`-mb-px block border-b-2 pb-3 pt-1 text-label transition-colors duration-100 ${
                  on ? "border-foreground font-semibold text-foreground" : "border-transparent text-secondary hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
