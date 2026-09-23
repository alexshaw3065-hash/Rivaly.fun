"use server";

import { verifyDynamicToken } from "@/lib/dynamic-jwt";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SyncWalletResult = { filled: boolean; address: string | null };

/**
 * Fills a signed-in account's missing wallet address from a fresh, verified
 * Dynamic token. The sign-in bridge only saves the address if Dynamic had
 * already provisioned the embedded wallet at that moment — often it hasn't,
 * which left accounts with no wallet (and nothing to stake from) until their
 * next full login. This closes that gap without one.
 *
 * Safe by construction: the token is verified server-side, it must belong to
 * the same Dynamic user as the signed-in profile, and an existing address is
 * never changed — only a missing one filled (same rule as the bridge).
 */
export async function syncWalletAddress(dynamicJwt: string | null | undefined): Promise<SyncWalletResult> {
  if (!dynamicJwt) return { filled: false, address: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { filled: false, address: null };

  let dynamicUser;
  try {
    dynamicUser = await verifyDynamicToken(dynamicJwt);
  } catch {
    return { filled: false, address: null };
  }
  if (!dynamicUser.walletAddress) return { filled: false, address: null };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ dynamic_wallet_address: dynamicUser.walletAddress })
    .eq("id", user.id)
    .eq("dynamic_user_id", dynamicUser.dynamicUserId)
    .is("dynamic_wallet_address", null)
    .select("dynamic_wallet_address")
    .maybeSingle();
  if (error || !data) return { filled: false, address: null };
  return { filled: true, address: data.dynamic_wallet_address as string };
}
