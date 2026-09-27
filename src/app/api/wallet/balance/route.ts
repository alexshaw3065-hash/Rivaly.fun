import { PublicKey } from "@solana/web3.js";
import { readBalancesAt } from "@/lib/wallet/balances";
import { PUBLIC_RPC_URL } from "@/lib/wallet/solana-rpc";

// Balance reads for the browser, through our Helius key (SOLANA_RPC_URL)
// without ever sending that key to a browser. Deliberately narrow — one
// question, "what does this address hold?", never a general RPC pass-through
// someone could borrow the key with — and rate-limited per visitor. Falls
// back to the public devnet RPC if Helius fails, so the worst case is the
// old speed, never a missing balance. Balances are public on-chain anyway.

const PER_MINUTE = 60;
const hits = new Map<string, { count: number; resetAt: number }>();
const inFlight = new Map<string, Promise<{ usdc: number; sol: number }>>();

function limited(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    return false;
  }
  h.count++;
  return h.count > PER_MINUTE;
}

async function read(address: string) {
  const helius = process.env.SOLANA_RPC_URL;
  if (helius) {
    try {
      return await readBalancesAt(helius, address);
    } catch {
      // fall through to the public endpoint
    }
  }
  return readBalancesAt(PUBLIC_RPC_URL, address);
}

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return Response.json({ error: "slow down" }, { status: 429 });

  const address = new URL(request.url).searchParams.get("address") ?? "";
  try {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) throw new Error();
    new PublicKey(address);
  } catch {
    return Response.json({ error: "not a Solana address" }, { status: 400 });
  }

  // Several parts of a page asking at once share one read.
  let pending = inFlight.get(address);
  if (!pending) {
    pending = read(address).finally(() => inFlight.delete(address));
    inFlight.set(address, pending);
  }
  try {
    const balances = await pending;
    // Balances move with every stake and payout — never cached.
    return Response.json(balances, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "balance unavailable" }, { status: 502 });
  }
}
