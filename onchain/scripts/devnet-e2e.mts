// Phase 5b: the app's own chain code (src/lib/escrow/program.ts, the stake
// check and co-signing in escrow.ts) against the program deployed on devnet,
// with throwaway wallets. No database: this proves the transactions the app
// builds work on the real chain; the database side is exercised by real
// admin rooms in Phase 4.
//
//   npx tsx --tsconfig tsconfig.json onchain/scripts/devnet-e2e.mts
//
// Reads ESCROW_SECRET_KEY / NEXT_PUBLIC_ESCROW_ADDRESS / WELCOME_SECRET_KEY /
// SOLANA_RPC_URL from .env.local (never printed). Lends the test wallets a few
// devnet USDC from the welcome wallet and returns it all at the end.

import fs from "node:fs";
import { randomUUID } from "node:crypto";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } = await import("@solana/web3.js");
const spl = await import("@solana/spl-token");
const bs58 = (await import("bs58")).default;
const escrow = await import("@/lib/escrow/escrow");
const program = await import("@/lib/escrow/program");
const { USDC_MINT } = await import("@/lib/wallet/constants");

const MINT = new PublicKey(USDC_MINT);
const UNITS = BigInt(10_000);
const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
const parseKey = (raw: string) => Keypair.fromSecretKey(raw.trim().startsWith("[") ? Uint8Array.from(JSON.parse(raw)) : bs58.decode(raw.trim()));
const welcome = parseKey(process.env.WELCOME_SECRET_KEY!);
const operator = new PublicKey(escrow.escrowAddress());
const ata = (owner: InstanceType<typeof PublicKey>) => spl.getAssociatedTokenAddressSync(MINT, owner);
const cents = async (owner: InstanceType<typeof PublicKey>) => {
  try {
    return Number(BigInt((await connection.getTokenAccountBalance(ata(owner))).value.amount) / UNITS);
  } catch {
    return 0;
  }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${what}`);
  if (!ok) failures++;
};

/** Gives each test wallet a USDC account holding `amount` cents, paid by the welcome wallet. */
async function fund(users: InstanceType<typeof Keypair>[], amount: number) {
  const tx = new Transaction();
  for (const u of users) {
    tx.add(
      spl.createAssociatedTokenAccountIdempotentInstruction(welcome.publicKey, ata(u.publicKey), u.publicKey, MINT),
      spl.createTransferCheckedInstruction(ata(welcome.publicKey), MINT, ata(u.publicKey), welcome.publicKey, BigInt(amount) * UNITS, 6),
    );
  }
  await sendAndConfirmTransaction(connection, tx, [welcome]);
}

/** Exactly what the app does: build on the server, the user signs, the server checks, co-signs and sends. */
async function stake(user: InstanceType<typeof Keypair>, args: Parameters<typeof program.buildProgramStakeTransaction>[2]) {
  const intentId = randomUUID();
  const prepared = await program.buildProgramStakeTransaction(user.publicKey.toBase58(), intentId, args);
  const tx = Transaction.from(Buffer.from(prepared.transactionBase64, "base64"));
  tx.partialSign(user);
  const signedB64 = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
  return escrow.cosignAndSend(signedB64, prepared.messageBase64, user.publicKey.toBase58(), prepared.lastValidBlockHeight, async () => {});
}

/** Sends test wallets' USDC back to the welcome wallet (the welcome wallet pays the fee). */
async function giveBack(users: InstanceType<typeof Keypair>[]) {
  const tx = new Transaction();
  const signers = [welcome];
  for (const u of users) {
    const c = await cents(u.publicKey);
    if (c > 0) {
      tx.add(spl.createTransferCheckedInstruction(ata(u.publicKey), MINT, ata(welcome.publicKey), u.publicKey, BigInt(c) * UNITS, 6));
      signers.push(u);
    }
    tx.add(spl.createCloseAccountInstruction(ata(u.publicKey), welcome.publicKey, u.publicKey));
    if (!signers.includes(u)) signers.push(u);
  }
  await sendAndConfirmTransaction(connection, tx, signers);
}

const welcomeStart = await cents(welcome.publicKey);
const treasuryStart = await cents(operator);
console.log(`welcome wallet: $${(welcomeStart / 100).toFixed(2)} · program ${program.roomPda(randomUUID()).toBase58().slice(0, 0)}${(await import("@/lib/wallet/constants")).RIVALY_ROOMS_PROGRAM_ID}`);

// ── Room 1: a normal room — three stakes, a refund, a result, payouts, close.
const [alice, bob, carol, dave] = [Keypair.generate(), Keypair.generate(), Keypair.generate(), Keypair.generate()];
await fund([alice, bob, carol, dave], 200);
const room1 = randomUUID();
const now = Math.floor(Date.now() / 1000);
const rules = { roomId: room1, host: alice.publicKey.toBase58(), feeBps: 300, hostFeeBps: 200, lockTs: now + 75, expiryTs: now + 75 + 3_600 };
console.log(`room 1 ${room1}`);

await stake(alice, { ...rules, side: "yes", amountCents: 150 });
await stake(bob, { ...rules, side: "no", amountCents: 100 });
await stake(carol, { ...rules, side: "yes", amountCents: 100 });
await stake(dave, { ...rules, side: "no", amountCents: 120 });
let chain = await program.readChainRoom(room1);
check(chain?.yesCents === 250 && chain?.noCents === 220 && chain?.positions === 4, "four stakes landed: YES $2.50, NO $2.20");
check((await cents(alice.publicKey)) === 50, "Alice's $1.50 left her wallet");

// Dave's stake "couldn't be recorded": refunded from the vault.
await escrow.sendSignedBatch(await program.signRefundPosition(room1, dave.publicKey.toBase58()));
chain = await program.readChainRoom(room1);
check((await cents(dave.publicKey)) === 200 && chain?.noCents === 100 && chain?.positions === 3, "Dave refunded in full, room totals updated");

// A tampered stake: the wallet changes the amount → the server refuses to co-sign.
{
  const prepared = await program.buildProgramStakeTransaction(dave.publicKey.toBase58(), randomUUID(), { ...rules, side: "no", amountCents: 100 });
  const evil = await program.buildProgramStakeTransaction(dave.publicKey.toBase58(), randomUUID(), { ...rules, side: "no", amountCents: 150 });
  const tx = Transaction.from(Buffer.from(evil.transactionBase64, "base64"));
  // Same transaction as the one Rivaly built in every way but the amount.
  tx.recentBlockhash = Transaction.from(Buffer.from(prepared.transactionBase64, "base64")).recentBlockhash;
  tx.partialSign(dave);
  let refused = false;
  try {
    await escrow.cosignAndSend(tx.serialize({ requireAllSignatures: false }).toString("base64"), prepared.messageBase64, dave.publicKey.toBase58(), prepared.lastValidBlockHeight, async () => {});
  } catch {
    refused = true;
  }
  check(refused && (await cents(dave.publicKey)) === 200, "a stake changed by the wallet is refused, nothing moves");
}

// Too early for a result.
let early = false;
try {
  await escrow.sendSignedBatch(await program.signResolve(room1, "yes", alice.publicKey.toBase58()));
} catch {
  early = true;
}
check(early, "a result before kick-off is refused on-chain");

const wait = rules.lockTs - Math.floor(Date.now() / 1000) + 5;
if (wait > 0) {
  console.log(`  … waiting ${wait}s for kick-off`);
  await sleep(wait * 1000);
}
// YES wins; Alice has the largest winning stake.
await escrow.sendSignedBatch(await program.signResolve(room1, "yes", alice.publicKey.toBase58()));
chain = await program.readChainRoom(room1);
// Pool 350, profit 100, fees 3 + 2; distributable 345.
check(chain?.outcome === "yes" && chain.rivalyFeeCents === 3 && chain.hostFeeCents === 2 && chain.distributableCents === 345, "result recorded, split frozen: fees $0.05, $3.45 to winners");

const owners = await program.openPositionOwners(room1);
check(owners.length === 3, "three unpaid positions found on-chain");
await escrow.sendSignedBatch(await program.signPayouts(room1, owners));
check((await program.openPositionOwners(room1)).length === 0, "one transaction paid all three");
// Alice floor(150·345/250)=207, Carol floor(100·345/250)=138; leftover 0.
check((await cents(alice.publicKey)) === 50 + 207, "Alice paid $2.07");
check((await cents(carol.publicKey)) === 100 + 138, "Carol paid $1.38");
check((await cents(bob.publicKey)) === 100, "Bob (NO) lost his $1.00");

let twice = false;
try {
  await escrow.sendSignedBatch(await program.signPayouts(room1, [alice.publicKey]));
} catch {
  twice = true;
}
check(twice && (await cents(alice.publicKey)) === 257, "paying Alice again is refused");

chain = await program.readChainRoom(room1);
await escrow.sendSignedBatch(await program.signCloseRoom(room1, chain!));
check((await program.readChainRoom(room1)) === null, "room and vault closed");
check((await cents(operator)) - treasuryStart === 5, "$0.05 of fees reached the treasury");

// ── Room 2: nobody resolves it — after expiry it's voided and refunded.
const erin = Keypair.generate();
await fund([erin], 200);
const room2 = randomUUID();
const t2 = Math.floor(Date.now() / 1000);
await stake(erin, { roomId: room2, host: erin.publicKey.toBase58(), feeBps: 300, hostFeeBps: 200, lockTs: t2 + 20, expiryTs: t2 + 45, side: "yes", amountCents: 100 });
console.log(`room 2 ${room2} — waiting for expiry`);
await sleep((t2 + 50 - Math.floor(Date.now() / 1000)) * 1000);
let resolveAfterExpiry = false;
try {
  await escrow.sendSignedBatch(await program.signResolve(room2, "yes", erin.publicKey.toBase58()));
} catch {
  resolveAfterExpiry = true;
}
check(resolveAfterExpiry, "a result after expiry is refused");
await escrow.sendSignedBatch(await program.signExpire(room2));
await escrow.sendSignedBatch(await program.signPayouts(room2, await program.openPositionOwners(room2)));
const c2 = await program.readChainRoom(room2);
await escrow.sendSignedBatch(await program.signCloseRoom(room2, c2!));
check((await cents(erin.publicKey)) === 200 && (await program.readChainRoom(room2)) === null, "expired room voided, Erin refunded, room closed");

// ── Give everything back.
await giveBack([alice, bob, carol, dave, erin]);
const welcomeEnd = await cents(welcome.publicKey);
console.log(`welcome wallet: $${(welcomeEnd / 100).toFixed(2)} (started $${(welcomeStart / 100).toFixed(2)}; the $0.05 fee stays in the treasury)`);
check(welcomeStart - welcomeEnd === 5, "all test USDC returned except the fee");
console.log(failures === 0 ? "\nALL DEVNET CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
