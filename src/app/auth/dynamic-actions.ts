"use server";

import { verifyDynamicToken } from "@/lib/dynamic-jwt";
import { createAdminClient } from "@/lib/supabase/admin";

export type BridgeDynamicSessionResult =
  | { ok: true; hashedToken: string; usernameIsPlaceholder: boolean }
  | { ok: false; error: string };

// The one place a Dynamic login becomes a real Supabase session. Verifies
// Dynamic's token independently (never trusts the client's word for it),
// then mirrors/looks up a matching auth.users row via the admin API —
// profiles.id is a hard FK to auth.users, so this has to create a real
// auth.users row (letting the existing handle_new_user() trigger do the
// rest), not a raw profiles insert. Everything after this one function
// returns is a completely normal Supabase session — same speed, same RLS,
// same everything, forever, as any other user.
export async function bridgeDynamicSession(dynamicJwt: string): Promise<BridgeDynamicSessionResult> {
  let dynamicUser;
  try {
    dynamicUser = await verifyDynamicToken(dynamicJwt);
  } catch {
    return { ok: false, error: "Couldn't verify your login — try again." };
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id, username_is_placeholder")
    .eq("dynamic_user_id", dynamicUser.dynamicUserId)
    .maybeSingle();

  let userId = existing?.id as string | undefined;
  let email = dynamicUser.email;
  // Dynamic never collects a Rivaly username, so handle_new_user() always
  // marks a brand-new signup as a placeholder — same flow OAuth signups
  // already go through via /auth/complete-profile.
  const usernameIsPlaceholder = existing?.username_is_placeholder ?? true;

  if (!userId) {
    // First-ever login for this Dynamic user. Wallet-only signups (no
    // email) get a synthetic, never-shown email — profiles has no email
    // column at all; this only ever lives inside auth.users, purely to
    // satisfy the admin API's shape below.
    email = email ?? `${dynamicUser.dynamicUserId}@wallet.users.rivaly.internal`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        dynamic_user_id: dynamicUser.dynamicUserId,
        dynamic_wallet_address: dynamicUser.walletAddress,
      },
    });
    if (createError || !created.user) {
      return { ok: false, error: "Couldn't create your account — try again." };
    }
    userId = created.user.id;
  } else if (!email) {
    // Returning user, this login didn't carry an email (e.g. logged in via
    // wallet this time) — look up the one already on file rather than
    // re-derive it, so the magiclink below always targets a stable address.
    const { data: userRow } = await admin.auth.admin.getUserById(userId);
    email = userRow.user?.email ?? null;
  }

  if (!email) {
    return { ok: false, error: "Couldn't sign you in — try again." };
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link) {
    return { ok: false, error: "Couldn't sign you in — try again." };
  }

  return { ok: true, hashedToken: link.properties.hashed_token, usernameIsPlaceholder };
}
