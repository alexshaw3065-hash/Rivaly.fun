// Rehearses settling a program room with the real settlement code
// (src/lib/settlement/settle-program.ts → payProgramRoom) on devnet. The
// room is a copy of a real one ($5 YES vs $5 NO, 3% + 2% fees) made with
// throwaway wallets; the database is a recorder that answers the reads and
// keeps every write, so the writes can be checked. Then it runs settlement
// a second time to prove a re-run pays nothing.
//   npx tsx --tsconfig tsconfig.json onchain/scripts/devnet-settle-rehearsal.mts
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
const { payProgramRoom } = await import("@/lib/settlement/settle-program");
const { USDC_MINT } = await import("@/lib/wallet/constants");

const MINT = new PublicKey(USDC_MINT);
const UNITS = BigInt(10_000);
const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
const raw = process.env.WELCOME_SECRET_KEY!.trim();
const welcome = Keypair.fromSecretKey(raw.startsWith("[") ? Uint8Array.from(JSON.parse(raw)) : bs58.decode(raw));
const ata = (o: InstanceType<typeof PublicKey>) => spl.getAssociatedTokenAddressSync(MINT, o);
const cents = async (o: InstanceType<typeof PublicKey>) => {
  try {
    return Number(BigInt((await connection.getTokenAccountBalance(ata(o))).value.amount) / UNITS);
  } catch {
    return 0;
  }
};
let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${what}`);
  if (!ok) failures++;
};

// ── A recording stand-in for the Supabase admin client ──────────────────
type Write = { table: string; op: string; values: unknown; filters: string[] };
const writes: Write[] = [];
function recorder(reads: Record<string, unknown>) {
  return {
    from(table: string) {
      const state = { table, op: "select", values: undefined as unknown, filters: [] as string[] };
      const builder: Record<string, unknown> = {};
      const chain = (name: string) => (...args: unknown[]) => {
        state.filters.push(`${name}(${args.map((a) => JSON.stringify(a)).join(",")})`);
        return builder;
      };
      for (const m of ["select", "eq", "neq", "not", "is", "in", "order", "limit", "gte", "lt"]) builder[m] = chain(m);
      builder.update = (v: unknown) => ((state.op = "update"), (state.values = v), builder);
      builder.upsert = (v: unknown) => ((state.op = "upsert"), (state.values = v), builder);
      builder.insert = (v: unknown) => ((state.op = "insert"), (state.values = v), builder);
      const result = () => {
        if (state.op !== "select") {
          writes.push({ ...state });
          return { data: null, error: null };
        }
        return { data: reads[table] ?? null, error: null };
      };
      builder.maybeSingle = () => Promise.resolve(result());
      builder.single = () => Promise.resolve(result());
      builder.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, bad);
      return builder;
    },
  };
}

// ── The room: a copy of RIVAL-HCGAAF with throwaway wallets ─────────────
const [yes, no] = [Keypair.generate(), Keypair.generate()];
{
  const tx = new Transaction();
  for (const u of [yes, no]) {
    tx.add(
      spl.createAssociatedTokenAccountIdempotentInstruction(welcome.publicKey, ata(u.publicKey), u.publicKey, MINT),
      spl.createTransferCheckedInstruction(ata(welcome.publicKey), MINT, ata(u.publicKey), welcome.publicKey, BigInt(500) * UNITS, 6),
    );
  }
  await sendAndConfirmTransaction(connection, tx, [welcome]);
}
const roomId = randomUUID();
const now = Math.floor(Date.now() / 1000);
const rules = { roomId, host: yes.publicKey.toBase58(), feeBps: 300, hostFeeBps: 200, lockTs: now + 45, expiryTs: now + 45 + 3_600 };
for (const [u, side] of [[yes, "yes"], [no, "no"]] as const) {
  const p = await program.buildProgramStakeTransaction(u.publicKey.toBase58(), randomUUID(), { ...rules, side, amountCents: 500 });
  const t = Transaction.from(Buffer.from(p.transactionBase64, "base64"));
  t.partialSign(u);
  await escrow.cosignAndSend(t.serialize({ requireAllSignatures: false }).toString("base64"), p.messageBase64, u.publicKey.toBase58(), p.lastValidBlockHeight, async () => {});
}
console.log(`room ${roomId}: $5 YES v $5 NO staked; waiting for kick-off…`);
await new Promise((r) => setTimeout(r, (rules.lockTs - Math.floor(Date.now() / 1000) + 5) * 1000));

const treasury = new PublicKey(escrow.escrowAddress());
const treasuryBefore = await cents(treasury);
const db = recorder({
  entries: [
    { id: "entry-yes", side: "yes", amount_cents: 500, profile: { dynamic_wallet_address: yes.publicKey.toBase58() } },
    { id: "entry-no", side: "no", amount_cents: 500, profile: { dynamic_wallet_address: no.publicKey.toBase58() } },
  ],
  rooms: { fee_bps: 300, host_fee_bps: 200 },
});

// ── Settle: YES wins ────────────────────────────────────────────────────
const state = await payProgramRoom(db as never, { id: roomId, creator_id: "host-id" }, "yes");
check(state === "settled", `settlement finished: ${state}`);
// Pool 1000, profit 500, fees 15 + 10, distributable 975.
check((await cents(yes.publicKey)) === 975, `YES paid $9.75 (got ${(await cents(yes.publicKey)) / 100})`);
check((await cents(no.publicKey)) === 0, "NO lost the $5");
check((await cents(treasury)) - treasuryBefore === 25, "$0.25 of fees in the treasury");
check((await program.readChainRoom(roomId)) === null, "room and vault closed on-chain");

const entryUpdates = writes.filter((w) => w.table === "entries" && w.op === "update");
const winner = entryUpdates.find((w) => w.filters.some((f) => f.includes("entry-yes")) && (w.values as { is_winner?: boolean }).is_winner !== undefined);
const loser = entryUpdates.find((w) => w.filters.some((f) => f.includes("entry-no")) && (w.values as { is_winner?: boolean }).is_winner !== undefined);
check(JSON.stringify(winner?.values) === JSON.stringify({ is_winner: true, payout_cents: 975 }), "database: YES entry marked won, $9.75");
check(JSON.stringify(loser?.values) === JSON.stringify({ is_winner: false, payout_cents: 0 }), "database: NO entry marked lost");
const receipt = entryUpdates.find((w) => (w.values as { payout_tx_signature?: string }).payout_tx_signature);
check(Boolean(receipt) && receipt!.filters.some((f) => f.includes("entry-yes")) && !receipt!.filters.some((f) => f.includes("entry-no")), "database: payout receipt on the winner only");
const fees = writes.find((w) => w.table === "room_fees")?.values as { kind: string; cents: number; recipient_id: string | null }[] | undefined;
check(JSON.stringify(fees?.map((f) => [f.kind, f.cents, f.recipient_id])) === JSON.stringify([["rivaly", 15, null], ["host", 10, "host-id"]]), "database: fees recorded — Rivaly $0.15, host $0.10");
check(writes.some((w) => w.table === "rooms" && (w.values as { status?: string }).status === "settled"), "database: room marked settled");

// ── Run it again: nothing more is paid ──────────────────────────────────
const yesAfter = await cents(yes.publicKey);
const again = await payProgramRoom(db as never, { id: roomId, creator_id: "host-id" }, "yes");
check(again === "settled" && (await cents(yes.publicKey)) === yesAfter && (await cents(treasury)) - treasuryBefore === 25, "a second run pays nothing more");

// ── Give the test USDC back ─────────────────────────────────────────────
{
  const tx = new Transaction();
  const c = await cents(yes.publicKey);
  if (c > 0) tx.add(spl.createTransferCheckedInstruction(ata(yes.publicKey), MINT, ata(welcome.publicKey), yes.publicKey, BigInt(c) * UNITS, 6));
  tx.add(spl.createCloseAccountInstruction(ata(yes.publicKey), welcome.publicKey, yes.publicKey));
  tx.add(spl.createCloseAccountInstruction(ata(no.publicKey), welcome.publicKey, no.publicKey));
  await sendAndConfirmTransaction(connection, tx, [welcome, yes, no]);
}
console.log(failures === 0 ? "\nREHEARSAL PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
