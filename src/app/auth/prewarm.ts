"use server";

// Deliberately separate from dynamic-jwt.ts — this never touches token
// verification, only does a plain network fetch to the same JWKS URL so a
// cold connection (DNS + TLS) to app.dynamicauth.com is already warm by
// the time a real login finishes and verifyDynamicToken needs it. The real
// verification path is untouched; this can't affect its correctness even
// if this prewarm does nothing useful.
//
// Fire-and-forget from the client the moment the auth modal opens — real
// signup recordings showed the single biggest cost in the bridge is a
// cold JWKS fetch (~1s), and by the time someone finishes picking a Google
// account or typing an OTP, several seconds have usually already passed.
// Whether this actually helps depends on the same serverless instance
// handling both calls, which isn't guaranteed — worth trying since it's
// free and can't make anything slower or less correct, not guaranteed to
// fully eliminate the cold-fetch cost.
const DYNAMIC_ENVIRONMENT_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

export async function prewarmDynamicAuth(): Promise<void> {
  if (!DYNAMIC_ENVIRONMENT_ID) return;
  try {
    await fetch(`https://app.dynamicauth.com/api/v0/sdk/${DYNAMIC_ENVIRONMENT_ID}/.well-known/jwks`, {
      cache: "no-store",
    });
  } catch {
    // Best-effort only — never surface this to the user, never affect the
    // real login flow that follows.
  }
}
