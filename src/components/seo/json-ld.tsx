import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, siteUrl } from "@/lib/site";
import { SOCIALS } from "@/lib/socials";

// Structured data (schema.org JSON-LD): the facts about a page spelled out
// for search engines and AI assistants, so they don't have to guess what
// Rivaly is, what a room is about, or which accounts are officially ours.
// `<` is escaped so text from users can never close the script tag.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Who Rivaly is and what the site is — on every page, from the root layout. */
export const SITE_GRAPH = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: siteUrl("/icon.png"),
      description: SITE_DESCRIPTION,
      sameAs: SOCIALS.map((s) => s.href),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
  ],
};
