// Decides whether the escrow may co-sign (and pay the fee for) a stake
// transaction the user's wallet sent back. Pure — no keys, no network — so
// every rule here is unit-tested (verify-stake-tx.test.ts).
//
// Why not a byte-for-byte match: some wallets (Phantom especially) add their
// own instructions while signing — a compute-budget fee setting and
// "Lighthouse" guard instructions that only assert account state. That's
// normal wallet behaviour, not tampering, and an exact match rejected every
// Phantom stake ("That transaction isn't the one Rivaly prepared").
//
// What must hold instead:
// 1. Same fee payer (escrow), same blockhash, and exactly two signers: the
//    escrow and the user.
// 2. Every instruction Rivaly wrote is present, unchanged and in order —
//    amount, source, destination, memo all identical.
// 3. Anything else is on a short allowlist, and can't borrow the escrow's
//    signature:
//    - Compute Budget (no accounts; fee price capped so the escrow's fee
//      stays tiny), and
//    - Lighthouse (assertions), provided it never references the escrow
//      wallet — the escrow signs the whole transaction, so any instruction
//      that lists it could act with its signature. The escrow's USDC account
//      may appear: Solana only lets an account's owning program (Token, not
//      Lighthouse) change it, so an assertion can only read it.
// Anything outside that — another transfer, a different amount, an extra
// signer — is refused, same as before.

import { ComputeBudgetProgram, Message, PublicKey, Transaction, type TransactionInstruction } from "@solana/web3.js";

const LIGHTHOUSE_PROGRAM_ID = new PublicKey("L2TExMFKdjpN9kozasaurPtfaNUEUq6uNUXrHqxQtnG");

/** Caps on what a wallet may set: price (micro-lamports per compute unit)
 *  × limit bounds the escrow's priority fee at 0.0004 SOL per stake. A stake
 *  uses well under 100k CU, so 400k leaves room for a wallet's assertions. */
export const MAX_CU_PRICE_MICRO_LAMPORTS = BigInt(1_000_000);
export const MAX_CU_LIMIT = 400_000;

export type StakeTxCheck = { ok: true; transaction: Transaction } | { ok: false; reason: string };

function sameInstruction(a: TransactionInstruction, b: TransactionInstruction): boolean {
  if (!a.programId.equals(b.programId)) return false;
  if (!a.data.equals(b.data)) return false;
  if (a.keys.length !== b.keys.length) return false;
  return a.keys.every(
    (k, i) => k.pubkey.equals(b.keys[i].pubkey) && k.isSigner === b.keys[i].isSigner && k.isWritable === b.keys[i].isWritable,
  );
}

function computeBudgetOk(ix: TransactionInstruction): boolean {
  if (ix.keys.length !== 0 || ix.data.length === 0) return false;
  switch (ix.data[0]) {
    case 1: // RequestHeapFrame
    case 4: // SetLoadedAccountsDataSizeLimit
      return true;
    case 2: // SetComputeUnitLimit (u32)
      return ix.data.length >= 5 && ix.data.readUInt32LE(1) <= MAX_CU_LIMIT;
    case 3: // SetComputeUnitPrice (u64 micro-lamports)
      return ix.data.length >= 9 && ix.data.readBigUInt64LE(1) <= MAX_CU_PRICE_MICRO_LAMPORTS;
    default:
      return false;
  }
}

/**
 * @param signedBase64 the transaction as the wallet returned it
 * @param expectedMessageBase64 the message Rivaly built for this stake intent
 * @param escrow the escrow (fee payer) address
 */
export function checkStakeTransaction(
  signedBase64: string,
  expectedMessageBase64: string,
  escrow: PublicKey,
  user: PublicKey,
): StakeTxCheck {
  let signed: Transaction;
  let expected: Transaction;
  try {
    signed = Transaction.from(Buffer.from(signedBase64, "base64"));
    expected = Transaction.populate(Message.from(Buffer.from(expectedMessageBase64, "base64")));
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  if (!signed.feePayer?.equals(escrow)) return { ok: false, reason: "fee_payer" };
  if (signed.recentBlockhash !== expected.recentBlockhash) return { ok: false, reason: "blockhash" };

  const signers = signed.signatures.map((s) => s.publicKey.toBase58()).sort();
  const wantSigners = [escrow.toBase58(), user.toBase58()].sort();
  if (signers.length !== 2 || signers[0] !== wantSigners[0] || signers[1] !== wantSigners[1]) {
    return { ok: false, reason: "signers" };
  }

  // Rivaly's instructions, unchanged and in order; everything between or
  // around them must pass the extras check.
  let next = 0;
  for (const ix of signed.instructions) {
    if (next < expected.instructions.length && sameInstruction(ix, expected.instructions[next])) {
      next++;
      continue;
    }
    if (ix.programId.equals(ComputeBudgetProgram.programId)) {
      if (!computeBudgetOk(ix)) return { ok: false, reason: "compute_budget" };
      continue;
    }
    if (ix.programId.equals(LIGHTHOUSE_PROGRAM_ID)) {
      if (ix.keys.some((k) => k.pubkey.equals(escrow))) return { ok: false, reason: "lighthouse_escrow" };
      continue;
    }
    return { ok: false, reason: `unexpected_instruction:${ix.programId.toBase58()}` };
  }
  if (next !== expected.instructions.length) return { ok: false, reason: "missing_instruction" };

  return { ok: true, transaction: signed };
}
