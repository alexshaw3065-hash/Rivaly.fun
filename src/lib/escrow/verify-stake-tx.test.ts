import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { checkStakeTransaction } from "./verify-stake-tx.ts";

const MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const LIGHTHOUSE = new PublicKey("L2TExMFKdjpN9kozasaurPtfaNUEUq6uNUXrHqxQtnG");
const BLOCKHASH = "EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N";

const escrow = Keypair.generate();
const user = Keypair.generate();
const escrowAta = getAssociatedTokenAddressSync(MINT, escrow.publicKey);
const userAta = getAssociatedTokenAddressSync(MINT, user.publicKey);

// Mirrors buildStakeTransaction in escrow.ts.
function stakeInstructions(units = BigInt(10_000_000)): TransactionInstruction[] {
  return [
    createAssociatedTokenAccountIdempotentInstruction(escrow.publicKey, escrowAta, escrow.publicKey, MINT),
    createTransferCheckedInstruction(userAta, MINT, escrowAta, user.publicKey, units, 6),
    new TransactionInstruction({ programId: MEMO, keys: [], data: Buffer.from("rivaly:stake:intent-1") }),
  ];
}

function build(instructions: TransactionInstruction[], feePayer = escrow.publicKey): Transaction {
  const tx = new Transaction({ feePayer, blockhash: BLOCKHASH, lastValidBlockHeight: 1000 });
  tx.add(...instructions);
  return tx;
}

const expectedMessage = build(stakeInstructions()).serializeMessage().toString("base64");

/** What the wallet hands back: the user's signature over whatever it signed. */
function signedByUser(tx: Transaction): string {
  tx.partialSign(user);
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

const check = (signed: string) => checkStakeTransaction(signed, expectedMessage, escrow.publicKey, user.publicKey);

describe("checkStakeTransaction — what wallets legitimately do", () => {
  it("accepts the exact transaction Rivaly built", () => {
    assert.equal(check(signedByUser(build(stakeInstructions()))).ok, true);
  });
  it("accepts Phantom-style compute-budget instructions", () => {
    const tx = build([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 80_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }),
      ...stakeInstructions(),
    ]);
    assert.equal(check(signedByUser(tx)).ok, true);
  });
  it("accepts Lighthouse assertions on the accounts involved (including the escrow's USDC account)", () => {
    const assertion = new TransactionInstruction({
      programId: LIGHTHOUSE,
      keys: [{ pubkey: escrowAta, isSigner: false, isWritable: false }],
      data: Buffer.from([7, 1, 2, 3]),
    });
    assert.equal(check(signedByUser(build([...stakeInstructions(), assertion]))).ok, true);
  });
});

describe("checkStakeTransaction — still refuses tampering", () => {
  it("a different amount", () => {
    const res = check(signedByUser(build(stakeInstructions(BigInt(1)))));
    assert.equal(res.ok, false);
  });
  it("an extra transfer out of the escrow", () => {
    const steal = SystemProgram.transfer({ fromPubkey: escrow.publicKey, toPubkey: user.publicKey, lamports: 1_000_000 });
    const res = check(signedByUser(build([...stakeInstructions(), steal])));
    assert.equal(res.ok, false);
  });
  it("a missing memo (instruction dropped)", () => {
    const res = check(signedByUser(build(stakeInstructions().slice(0, 2))));
    assert.deepEqual(res, { ok: false, reason: "missing_instruction" });
  });
  it("a different fee payer", () => {
    const res = check(signedByUser(build(stakeInstructions(), user.publicKey)));
    assert.equal(res.ok, false);
  });
  it("a sky-high priority fee the escrow would pay", () => {
    const tx = build([ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000_000 }), ...stakeInstructions()]);
    assert.deepEqual(check(signedByUser(tx)), { ok: false, reason: "compute_budget" });
  });
  it("a Lighthouse instruction that lists the escrow wallet (could borrow its signature)", () => {
    const borrow = new TransactionInstruction({
      programId: LIGHTHOUSE,
      keys: [{ pubkey: escrow.publicKey, isSigner: true, isWritable: true }],
      data: Buffer.from([0]),
    });
    const res = check(signedByUser(build([...stakeInstructions(), borrow])));
    assert.deepEqual(res, { ok: false, reason: "lighthouse_escrow" });
  });
  it("an extra signer", () => {
    const other = Keypair.generate();
    const ix = new TransactionInstruction({ programId: MEMO, keys: [{ pubkey: other.publicKey, isSigner: true, isWritable: false }], data: Buffer.from("x") });
    const tx = build([...stakeInstructions(), ix]);
    tx.partialSign(other);
    assert.deepEqual(check(signedByUser(tx)), { ok: false, reason: "signers" });
  });
});
