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
import { checkStakeTransaction } from "./verify-stake-tx";

const RPC_URL = process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const COMMITMENT: Commitment = "confirmed";
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const MINT = new PublicKey(USDC_MINT);
// Cents → USDC base units (6 decimals): 1 cent = 10_000 units.
const UNITS_PER_CENT = BigInt(10 ** (USDC_DECIMALS - 2));
// Payouts per transaction — each transfer (plus creating a recipient's USDC
// account when needed) must fit Solana's 1232-byte transaction limit.
export const PAYOUTS_PER_TX = 6;

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

/**
 * The escrow key as the on-chain program's operator and fee payer — only
 * for src/lib/escrow/program.ts, which can move money only where the
 * program's rules allow (docs/plans/onchain-escrow.md).
 */
export function escrowSigner(): { keypair: Keypair; connection: Connection } {
  return escrow();
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
 * Takes the user-signed stake transaction, and only if it is the one this
 * server built — same amount, destination, fee payer, memo, with nothing
 * added beyond a wallet's own harmless extras (see verify-stake-tx.ts) —
 * adds the escrow's fee signature, sends it and waits for confirmation.
 * This is what stops anyone getting Rivaly to pay fees for a transaction it
 * didn't write.
 */
export async function cosignAndSend(
  signedBase64: string,
  expectedMessageBase64: string,
  userAddress: string,
  lastValidBlockHeight: number,
  // Called with the transaction's signature once it's fully signed and
  // BEFORE it's sent, so the caller can record it — if confirmation then
  // times out, a recovery pass can still look the transfer up on-chain.
  onSigned: (signature: string) => Promise<void>,
): Promise<string> {
  const { keypair, connection } = escrow();
  const user = new PublicKey(userAddress);
  const check = checkStakeTransaction(signedBase64, expectedMessageBase64, keypair.publicKey, user);
  if (!check.ok) {
    console.warn(`[escrow] refused stake transaction: ${check.reason}`);
    throw new EscrowError("Your wallet changed the stake, so Rivaly didn't send it — nothing moved. Try again.");
  }
  const tx = check.transaction;
  const userSig = tx.signatures.find((s) => s.publicKey.toBase58() === userAddress);
  if (!userSig?.signature) throw new EscrowError("The stake wasn't signed by your wallet.");

  tx.partialSign(keypair);
  if (!tx.verifySignatures()) throw new EscrowError("Signature check failed.");

  await onSigned(bs58.encode(tx.signature!));
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

export interface SignedBatch {
  payouts: Payout[];
  /** Known before sending — recorded first so a re-run can't pay twice. */
  signature: string;
  serialized: string;
  blockhash: string;
  lastValidBlockHeight: number;
}

/**
 * Builds and signs one payout batch (winnings or refunds) from escrow,
 * creating any recipient's USDC account if it doesn't exist yet — but does
 * NOT send it. The caller records the signature, then calls sendSignedBatch.
 */
export async function signPayoutBatch(batch: Payout[]): Promise<SignedBatch> {
  const { keypair, connection } = escrow();
  const escrowAta = getAssociatedTokenAddressSync(MINT, keypair.publicKey);
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
  return {
    payouts: batch,
    signature: bs58.encode(tx.signature!),
    serialized: tx.serialize().toString("base64"),
    blockhash,
    lastValidBlockHeight,
  };
}

export async function sendSignedBatch(batch: SignedBatch): Promise<void> {
  const { connection } = escrow();
  const signature = await connection.sendRawTransaction(Buffer.from(batch.serialized, "base64"), {
    preflightCommitment: COMMITMENT,
  });
  const result = await connection.confirmTransaction(
    { signature, blockhash: batch.blockhash, lastValidBlockHeight: batch.lastValidBlockHeight },
    COMMITMENT,
  );
  if (result.value.err) throw new EscrowError(`Payout failed on-chain (${signature}).`);
}

/**
 * Where a previously-sent transaction stands: landed, failed, or not found.
 * With the current block height, "not found" past its validity means it
 * can never land and is safe to rebuild; before that, it may still land.
 */
export async function transactionState(signature: string): Promise<"confirmed" | "failed" | "unknown"> {
  const { connection } = escrow();
  const { value } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
  const status = value[0];
  if (!status) return "unknown";
  if (status.err) return "failed";
  return status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized" ? "confirmed" : "unknown";
}

export async function currentBlockHeight(): Promise<number> {
  return escrow().connection.getBlockHeight(COMMITMENT);
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
