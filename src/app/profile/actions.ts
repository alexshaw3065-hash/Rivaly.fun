"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isCloudinaryUrl } from "@/lib/cloudinary";
import type { SocialLink } from "@/lib/types";

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

// displayName/bio/socialLinks/avatarUrl. ringColor/bannerColor stay a
// local, session-only preview for now (no ring_color/banner_color columns
// exist yet — a deliberate smaller-scope cut, not an oversight).
export async function updateProfile(input: {
  displayName: string;
  bio: string;
  socialLinks: SocialLink[];
  avatarUrl?: string | null;
}): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to edit your profile." };
  if (!input.displayName.trim()) return { ok: false, error: "Display name can't be empty." };
  // A tampered client request shouldn't be able to point avatar_url at an
  // arbitrary/oversized/tracking URL — only null or a real Cloudinary
  // delivery URL (from uploadAvatarImage) is accepted.
  if (input.avatarUrl != null && !isCloudinaryUrl(input.avatarUrl)) {
    return { ok: false, error: "Couldn't save that photo — try again." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName.trim(),
      bio: input.bio.trim() || null,
      social_links: input.socialLinks,
      ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: "Couldn't save — try again." };

  revalidatePath("/profile/[username]", "page");
  return { ok: true };
}

export type FollowResult = { ok: true; following: boolean } | { ok: false; error: string };

export async function toggleFollow(targetUserId: string, currentlyFollowing: boolean): Promise<FollowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to follow rivals." };
  if (user.id === targetUserId) return { ok: false, error: "You can't follow yourself." };

  if (currentlyFollowing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);
    if (error) return { ok: false, error: "Couldn't unfollow — try again." };
    revalidatePath("/profile/[username]", "page");
    return { ok: true, following: false };
  }

  const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: targetUserId });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return { ok: false, error: "Couldn't follow — try again." };
  }
  revalidatePath("/profile/[username]", "page");
  return { ok: true, following: true };
}
