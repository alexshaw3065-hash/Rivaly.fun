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

  // dynamic_identities, not profiles.dynamic_user_id — one profile can own
  // more than one Dynamic identity (see the migration this table came from
  // for why: Dynamic doesn't unify a Google login and an email-OTP login
  // for the same person on its own, so this app has to).
  const { data: identity } = await admin
    .from("dynamic_identities")
    .select("profile_id")
    .eq("dynamic_user_id", dynamicUser.dynamicUserId)
    .maybeSingle();

  let userId = identity?.profile_id as string | undefined;
  let email = dynamicUser.email;
  // Dynamic never collects a Rivaly username, so handle_new_user() always
  // marks a brand-new signup as a placeholder — same flow OAuth signups
  // already go through via /auth/complete-profile. Overwritten below for
  // a returning identity.
  let usernameIsPlaceholder = true;

  if (userId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("username_is_placeholder")
      .eq("id", userId)
      .single();
    usernameIsPlaceholder = profile?.username_is_placeholder ?? true;

    if (!email) {
      // Returning user, this login didn't carry an email (e.g. logged in
      // via wallet this time) — look up the one already on file rather
      // than re-derive it, so the magiclink below always targets a stable
      // address.
      const { data: userRow } = await admin.auth.admin.getUserById(userId);
      email = userRow.user?.email ?? null;
    }
  } else {
    // No identity on file for this dynamic_user_id — either a genuinely
    // new person, or someone returning through a *different* login method
    // than the one they signed up with. createUser tells us which: it
    // fails with `email_exists` only when a real account already owns
    // this email, which is exactly the second case — at no extra cost
    // for the far more common brand-new-signup case, since we're only
    // reacting to an error createUser already had to check for anyway.
    email = email ?? `${dynamicUser.dynamicUserId}@wallet.users.rivaly.internal`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        dynamic_user_id: dynamicUser.dynamicUserId,
        dynamic_wallet_address: dynamicUser.walletAddress,
      },
    });

    if (created?.user) {
      userId = created.user.id;
    } else if (createError?.code === "email_exists") {
      const { data: existingUserId, error: lookupError } = await admin.rpc("get_user_id_by_email", {
        p_email: email,
      });
      if (lookupError || !existingUserId) {
        return { ok: false, error: "Couldn't sign you in — try again." };
      }
      userId = existingUserId;

      const { data: profile } = await admin
        .from("profiles")
        .select("username_is_placeholder")
        .eq("id", userId)
        .single();
      usernameIsPlaceholder = profile?.username_is_placeholder ?? true;
    } else {
      return { ok: false, error: "Couldn't create your account — try again." };
    }

    const { error: identityError } = await admin
      .from("dynamic_identities")
      .insert({ dynamic_user_id: dynamicUser.dynamicUserId, profile_id: userId });
    if (identityError) {
      return { ok: false, error: "Couldn't sign you in — try again." };
    }
  }

  if (!email || !userId) {
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
