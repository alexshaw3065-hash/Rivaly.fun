import { createRemoteJWKSet, jwtVerify } from "jose";

// Server-side verification of a Dynamic-issued JWT — never trust one just
// because the client sent it. createRemoteJWKSet fetches Dynamic's public
// signing keys once and caches them in memory, so this only costs a real
// network round-trip on the first call per server instance (the rest are
// free) — see the login-latency breakdown this was designed against.
//
// The JWKS URL is already scoped to our specific Dynamic environment, so a
// token signed by a different environment (or forged) simply fails
// signature verification here — that scoping is doing the same job an
// explicit `iss` check would, without needing to hardcode/guess Dynamic's
// exact issuer string. Confirmed live: this host matches the "JWKS
// Endpoint" shown on Dynamic's own SDK and API Keys dashboard page, and a
// real Google-login token verified successfully against it end to end.
const DYNAMIC_ENVIRONMENT_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!DYNAMIC_ENVIRONMENT_ID) {
    throw new Error("NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is not configured.");
  }
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`https://app.dynamicauth.com/api/v0/sdk/${DYNAMIC_ENVIRONMENT_ID}/.well-known/jwks`),
    );
  }
  return jwks;
}

interface DynamicVerifiedCredential {
  format?: string;
  address?: string;
  chain?: string;
}

export interface DynamicUser {
  dynamicUserId: string;
  email: string | null;
  walletAddress: string | null;
}

export async function verifyDynamicToken(token: string): Promise<DynamicUser> {
  const { payload } = await jwtVerify(token, getJwks());

  const scope = typeof payload.scope === "string" ? payload.scope : "";
  if (!scope.split(" ").includes("user:basic")) {
    throw new Error("Dynamic token missing user:basic scope.");
  }

  const sub = payload.sub;
  if (!sub) throw new Error("Dynamic token missing sub claim.");

  const email = typeof payload.email === "string" ? payload.email : null;

  const verifiedCredentials = Array.isArray(payload.verified_credentials)
    ? (payload.verified_credentials as DynamicVerifiedCredential[])
    : [];
  const walletCredential = verifiedCredentials.find(
    (c) => c.format === "blockchain" && c.chain === "solana" && c.address,
  );

  return {
    dynamicUserId: sub,
    email,
    walletAddress: walletCredential?.address ?? null,
  };
}
