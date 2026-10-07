// Rivaly's company and legal facts in one place — the menu, the sidebar,
// the site footer and every company page read from here, so a change (an
// incorporated entity, a new address, a policy revision) is one edit.

export const COMPANY = {
  name: "Rivaly",
  site: "rivaly.fun",
  email: "support@rivaly.fun",
  /**
   * The registered company that operates Rivaly, and the law its terms are
   * governed by. Not incorporated yet (founder, 2026-10-08): while these are
   * null the Terms say nothing about either — set both once it exists and
   * the governing-law clause appears.
   */
  entity: null as string | null,
  governingLaw: null as string | null,
} as const;

export const mailto = (subject?: string) => `mailto:${COMPANY.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;

/**
 * Each policy's effective date. Change it whenever the text changes in
 * substance — and say what changed in the page's "Changes" section.
 */
export const POLICY_DATES = {
  terms: "2026-10-08",
  privacy: "2026-10-08",
  responsiblePlay: "2026-10-08",
  guide: "2026-10-08",
} as const;

export function formatPolicyDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export type CompanyLink = { href: string; label: string };

/** The company pages, grouped the way the menu shows them. */
export const COMPANY_GROUPS: { title: string; links: CompanyLink[] }[] = [
  {
    title: "Learn",
    links: [
      { href: "/docs", label: "How Rivaly works" },
      { href: "/about", label: "About Rivaly" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/support", label: "Support" },
      { href: "/responsible-play", label: "Responsible play" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Use" },
      { href: "/privacy", label: "Privacy Policy" },
    ],
  },
];

/** Short labels for the tab strip across the top of every company page. */
export const COMPANY_TABS: CompanyLink[] = [
  { href: "/about", label: "About" },
  { href: "/docs", label: "How it works" },
  { href: "/support", label: "Support" },
  { href: "/responsible-play", label: "Responsible play" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];
