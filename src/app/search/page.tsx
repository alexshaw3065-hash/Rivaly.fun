import { SearchBody } from "@/components/search-body";
import { pageMeta } from "@/lib/seo";

// Results pages aren't useful as search results themselves; the rooms and
// profiles they link to are indexed on their own.
export const metadata = pageMeta({ title: "Search", description: "Search Rivaly for rooms, matches and rivals.", path: "/search", noindex: true });

// Desktop's real Search experience, and mobile's fallback for a direct
// visit/refresh (normal mobile use never lands here — the bottom tab's
// Search button and Home's search bar open mobile-search-overlay.tsx
// instead, a true overlay on top of whatever page you were on, not a
// navigation. See docs/masterplan/07-product-blueprint.md#411-search for
// scope, and search-body.tsx for the actual idle/browse/query states.
export default function SearchPage() {
  return (
    <main className="mx-auto min-w-0 max-w-5xl px-4 py-6 md:px-6 md:pb-12 md:pt-12">
      <SearchBody />
    </main>
  );
}
