"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SocialLink } from "@/lib/types";

export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

// displayName/bio/socialLinks only — ringColor/bannerColor stay a local,
// session-only preview for now (no ring_color/banner_color columns exist
// yet; they're a deliberate smaller-scope cut, not an oversight — see
// profile-edit-sheet.tsx's own comment on why a color picker stands in
// for a real photo-upload pipeline that doesn't exist yet either).
export async function updateProfile(input: {
  displayName: string;
  bio: string;
  socialLinks: SocialLink[];
}): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to edit your profile." };
  if (!input.displayName.trim()) return { ok: false, error: "Display name can't be empty." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName.trim(),
      bio: input.bio.trim() || null,
      social_links: input.socialLinks,
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
