import { PageShell } from "@/components/page-shell";

// Minimal for V1 per docs/masterplan/08-v1-scope.md: history, followers,
// accuracy. Full field list in
// docs/masterplan/07-product-blueprint.md#47-profile.
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <PageShell title={`@${username}`} purpose="Reputation, accuracy, and history.">
      <p className="text-sm text-muted">Profile not wired up yet.</p>
    </PageShell>
  );
}
