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
    .select("id, username_is_placeholder, dynamic_wallet_address")
    .eq("dynamic_user_id", dynamicUser.dynamicUserId)
    .maybeSingle();

  let userId = existing?.id as string | undefined;
  let email = dynamicUser.email;
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

  // Self-healing, not just set-once-at-creation: confirmed via Dynamic's
  // own User Management dashboard that every real test signup so far has a
  // real embedded Solana wallet on Dynamic's side, yet dynamic_wallet_address
  // stayed null on every one of those profiles — the embedded wallet isn't
  // provisioned in time to be in the very first token handle_new_user() saw
  // at account-creation. Every login re-verifies a fresh token, so just
  // keep checking here — the next login after Dynamic finishes provisioning
  // it fills this in for free, no separate backfill job needed. Kicked off
  // here rather than awaited immediately: it writes to a different row
  // (profiles) than generateLink touches (auth.users' session state), so
  // there's no correctness reason for the sign-in to wait on it — it runs
  // alongside generateLink below instead of adding its own latency in front
  // of it. Its own errors were never surfaced even before this change
  // (best-effort), so running it concurrently doesn't change what the
  // caller can observe, only how long it takes.
  //
  // Fills a missing address only — deliberately never repoints an existing
  // one. verifyDynamicToken picks the first Solana credential in the token
  // with no way to tell an embedded wallet from a connected one, so if a
  // token ever carries two, array order would decide which address this
  // writes. That column is now what the whole wallet UI reads for balance,
  // the receive address, and which wallet signs a withdrawal, so silently
  // repointing it would make real funds invisible. Filling a null can't
  // have that effect, and that was the only case this was ever for.
  const walletUpdate =
    dynamicUser.walletAddress && !existing?.dynamic_wallet_address
      ? admin.from("profiles").update({ dynamic_wallet_address: dynamicUser.walletAddress }).eq("id", userId)
      : null;

  if (!email) {
    return { ok: false, error: "Couldn't sign you in — try again." };
  }

  const [, { data: link, error: linkError }] = await Promise.all([
    walletUpdate ?? Promise.resolve(null),
    admin.auth.admin.generateLink({ type: "magiclink", email }),
  ]);
  if (linkError || !link) {
    return { ok: false, error: "Couldn't sign you in — try again." };
  }

  return { ok: true, hashedToken: link.properties.hashed_token, usernameIsPlaceholder };
}
