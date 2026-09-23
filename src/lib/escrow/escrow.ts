// Server-only. The ONLY module that touches the escrow's secret key — every
// stake co-signature, payout and refund goes through here. Never import it
// from a client component. See docs/plans/escrow-wallet-build.md.
//
// Fails closed: without a key, or with a key that doesn't match the public
// address the app advertises, nothing that moves money will run.

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type Commitment,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import { USDC_DECIMALS, USDC_MINT } from "@/lib/wallet/constants";

const RPC_URL = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const COMMITMENT: Commitment = "confirmed";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const MINT = new PublicKey(USDC_MINT);
// Cents → USDC base units (6 decimals): 1 cent = 10_000 units.
const UNITS_PER_CENT = BigInt(10 ** (USDC_DECIMALS - 2));
// Payouts per transaction — each transfer (plus creating a recipient's USDC
// account when needed) must fit Solana's 1232-byte transaction limit.
const PAYOUTS_PER_TX = 6;

export class EscrowError extends Error {}

let cached: { keypair: Keypair; connection: Connection } | null = null;

/** Accepts the two formats wallets export: base58 (Phantom/Solflare) or a JSON byte array (solana-keygen). */
function parseSecretKey(raw: string): Uint8Array {
  const value = raw.trim();
  if (value.startsWith("[")) return Uint8Array.from(JSON.parse(value) as number[]);
  return bs58.decode(value);
}

export function escrowConfigured(): boolean {
  return Boolean(process.env.ESCROW_SECRET_KEY && process.env.NEXT_PUBLIC_ESCROW_ADDRESS);
}

function escrow(): { keypair: Keypair; connection: Connection } {
  if (cached) return cached;
  const secret = process.env.ESCROW_SECRET_KEY;
  const advertised = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
  if (!secret || !advertised) throw new EscrowError("Escrow isn't configured.");
  let keypair: Keypair;
  try {
    keypair = Keypair.fromSecretKey(parseSecretKey(secret));
  } catch {
    throw new EscrowError("ESCROW_SECRET_KEY isn't a valid Solana secret key.");
  }
  if (keypair.publicKey.toBase58() !== advertised) {
    throw new EscrowError("ESCROW_SECRET_KEY doesn't match NEXT_PUBLIC_ESCROW_ADDRESS.");
  }
  cached = { keypair, connection: new Connection(RPC_URL, COMMITMENT) };
  return cached;
}

export function escrowAddress(): string {
  return escrow().keypair.publicKey.toBase58();
}

const toUnits = (cents: number) => BigInt(cents) * UNITS_PER_CENT;

export interface PreparedStake {
  /** Unsigned transaction for the user's wallet to sign (base64). */
  transactionBase64: string;
  /** The exact message the escrow agreed to pay the fee for (base64). */
  messageBase64: string;
  lastValidBlockHeight: number;
}

/**
 * The stake transfer, built by the server so its amount and destination
 * can't be chosen by the client: user's USDC → escrow's USDC, the escrow as
 * fee payer (gasless for the user), and a memo tying it to one stake intent.
 */
export async function buildStakeTransaction(userAddress: string, cents: number, intentId: string): Promise<PreparedStake> {
  const { keypair, connection } = escrow();
  const user = new PublicKey(userAddress);
  const escrowAta = getAssociatedTokenAddressSync(MINT, keypair.publicKey);
  const userAta = getAssociatedTokenAddressSync(MINT, user);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(COMMITMENT);

  const tx = new Transaction({ feePayer: keypair.publicKey, blockhash, lastValidBlockHeight });
  tx.add(
    // No-op once the escrow's USDC account exists; the escrow pays its rent the first time.
    createAssociatedTokenAccountIdempotentInstruction(keypair.publicKey, escrowAta, keypair.publicKey, MINT),
    createTransferCheckedInstruction(userAta, MINT, escrowAta, user, toUnits(cents), USDC_DECIMALS),
    new TransactionInstruction({ programId: MEMO_PROGRAM_ID, keys: [], data: Buffer.from(`rivaly:stake:${intentId}`) }),
  );

  return {
    transactionBase64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    messageBase64: tx.serializeMessage().toString("base64"),
    lastValidBlockHeight,
  };
}

/**
 * Takes the user-signed stake transaction, and only if it is byte-for-byte
 * the one this server built — same amount, destination, fee payer, memo —
 * adds the escrow's fee signature, sends it and waits for confirmation.
 * This is what stops anyone getting Rivaly to pay fees for a transaction it
 * didn't write.
 */
export async function cosignAndSend(signedBase64: string, expectedMessageBase64: string, userAddress: string, lastValidBlockHeight: number): Promise<string> {
  const { keypair, connection } = escrow();
  const tx = Transaction.from(Buffer.from(signedBase64, "base64"));

  if (tx.serializeMessage().toString("base64") !== expectedMessageBase64) {
    throw new EscrowError("That transaction isn't the one Rivaly prepared.");
  }
  const userSig = tx.signatures.find((s) => s.publicKey.toBase58() === userAddress);
  if (!userSig?.signature) throw new EscrowError("The stake wasn't signed by your wallet.");

  tx.partialSign(keypair);
  if (!tx.verifySignatures()) throw new EscrowError("Signature check failed.");

  const signature = await connection.sendRawTransaction(tx.serialize(), { preflightCommitment: COMMITMENT });
  const result = await connection.confirmTransaction(
    { signature, blockhash: tx.recentBlockhash!, lastValidBlockHeight },
    COMMITMENT,
  );
  if (result.value.err) throw new EscrowError("The stake transfer failed on-chain.");
  return signature;
}

export interface Payout {
  to: string;
  cents: number;
}

/**
 * Sends USDC from escrow — winnings or refunds — batching several per
 * transaction, creating any recipient's USDC account if it doesn't exist
 * yet. Returns one signature per batch, in order.
 */
export async function sendFromEscrow(payouts: Payout[]): Promise<{ payouts: Payout[]; signature: string }[]> {
  const { keypair, connection } = escrow();
  const escrowAta = getAssociatedTokenAddressSync(MINT, keypair.publicKey);
  const results: { payouts: Payout[]; signature: string }[] = [];

  for (let i = 0; i < payouts.length; i += PAYOUTS_PER_TX) {
    const batch = payouts.slice(i, i + PAYOUTS_PER_TX).filter((p) => p.cents > 0);
    if (batch.length === 0) continue;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(COMMITMENT);
    const tx = new Transaction({ feePayer: keypair.publicKey, blockhash, lastValidBlockHeight });
    for (const p of batch) {
      const owner = new PublicKey(p.to);
      const ata = getAssociatedTokenAddressSync(MINT, owner);
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(keypair.publicKey, ata, owner, MINT),
        createTransferCheckedInstruction(escrowAta, MINT, ata, keypair.publicKey, toUnits(p.cents), USDC_DECIMALS),
      );
    }
    tx.sign(keypair);
    const signature = await connection.sendRawTransaction(tx.serialize(), { preflightCommitment: COMMITMENT });
    const result = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, COMMITMENT);
    if (result.value.err) throw new EscrowError(`Payout batch failed on-chain (${signature}).`);
    results.push({ payouts: batch, signature });
  }
  return results;
}

/** The escrow's USDC balance in cents — for reconciliation against open stakes. */
export async function escrowUsdcCents(): Promise<number> {
  const { keypair, connection } = escrow();
  const ata = getAssociatedTokenAddressSync(MINT, keypair.publicKey);
  try {
    const bal = await connection.getTokenAccountBalance(ata, COMMITMENT);
    return Number(BigInt(bal.value.amount) / UNITS_PER_CENT);
  } catch {
    return 0; // No USDC account yet = nothing in escrow.
  }
}
