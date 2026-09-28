import Link from "next/link";
import type { Metadata } from "next";
import { getProfileByUsername, currentUserFollows } from "@/lib/supabase/profiles";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import { ProfileView } from "@/components/profile-view";

// Reddit-inspired header + a trading-app-style PNL block (self-only,
// real balance history — see profile-pnl.tsx) + Position/Replies/Activity,
// all built per the founder's approved redesign plan. See ProfileView for
// the actual layout; this file is just the data fetch + not-found state.
// Title and description for shared links (the image is opengraph-image.tsx).
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Rivaly" };
  const name = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(profile.displayName) ? `@${profile.username}` : profile.displayName;
  const title = `${name} (@${profile.username}) on Rivaly`;
  const description = profile.bio?.slice(0, 160) || `${name}'s Rivaly card — their record, form and calls. Think you can beat them?`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [profile, currentUser] = await Promise.all([
    getProfileByUsername(username),
    getCurrentProfile(),
  ]);

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
        <p className="font-display text-xl font-semibold text-foreground">Rival not found</p>
        <p className="mt-2 text-body text-secondary">@{username} doesn&rsquo;t exist.</p>
        <Link href="/" className="mt-6 inline-block text-body text-foreground hover:underline">
          ← Back home
        </Link>
      </main>
    );
  }

  const isSelf = currentUser !== null && profile.id === currentUser.id;
  const initialFollowing = isSelf ? false : await currentUserFollows(profile.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <ProfileView profile={profile} isSelf={isSelf} initialFollowing={initialFollowing} />
    </main>
  );
}
