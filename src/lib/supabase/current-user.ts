import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

// The database row shape (snake_case) vs. the app's Profile type
// (camelCase, per src/lib/types.ts). Every Supabase-backed profile read
// goes through this mapper so the rest of the app never has to know the
// column names changed.
export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  social_links: { platform: string; handle: string }[];
  follower_count: number;
  following_count: number;
  rooms_created_count: number;
  prediction_accuracy: number;
  total_winnings_cents: number;
  created_at: string;
  dynamic_wallet_address: string | null;
  banner_color?: string | null;
  banner_url?: string | null;
  ring_color?: string | null;
}

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    socialLinks: row.social_links as Profile["socialLinks"],
    followerCount: row.follower_count,
    followingCount: row.following_count,
    roomsCreated: row.rooms_created_count,
    predictionAccuracy: row.prediction_accuracy,
    totalWinningsCents: row.total_winnings_cents,
    createdAt: row.created_at,
    dynamicWalletAddress: row.dynamic_wallet_address,
    bannerColor: row.banner_color ?? null,
    bannerUrl: row.banner_url ?? null,
    ringColor: row.ring_color ?? null,
  };
}

const PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, bio, social_links, follower_count, following_count, rooms_created_count, prediction_accuracy, total_winnings_cents, created_at, dynamic_wallet_address, banner_color, ring_color, banner_url";

/** Server-only. The signed-in user's own real profile, or null if signed out. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();
  if (!data) return null;

  return mapProfileRow(data as ProfileRow);
}

export { PROFILE_COLUMNS };
