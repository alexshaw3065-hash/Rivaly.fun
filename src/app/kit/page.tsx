import { notFound } from "next/navigation";
import { KitPreview } from "./kit-preview";

// Design-system kit preview (docs/plans/design-system-rebuild.md, Phase 1):
// every kit component next to the markup it replaces. Development only —
// never served in production.
export default function KitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitPreview />;
}
