import Link from "next/link";
import { profileByUsername, SELF_USER_ID } from "@/lib/mock-data";
import { ProfileView } from "@/components/profile-view";

// Reddit-inspired header + a trading-app-style PNL block (self-only,
// real balance history — see profile-pnl.tsx) + Position/Replies/Activity,
// all built per the founder's approved redesign plan. See ProfileView for
// the actual layout; this file is just the data fetch + not-found state.
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = profileByUsername(username);

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="font-display text-xl font-semibold text-foreground">Rival not found</p>
        <p className="mt-2 text-sm text-muted">@{username} doesn&rsquo;t exist.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-foreground hover:underline">
          ← Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <ProfileView profile={profile} isSelf={profile.id === SELF_USER_ID} />
    </main>
  );
}
