import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PublicKey } from "@solana/web3.js";
import { decodeRoom, encodeStakeArgs, IX, uuidBytes } from "./program-codec.ts";

const idl = JSON.parse(fs.readFileSync(new URL("../../../onchain/idl/rivaly_rooms.json", import.meta.url), "utf8")) as {
  instructions: { name: string; discriminator: number[] }[];
  accounts: { name: string; discriminator: number[] }[];
  types: { name: string; type: { fields: { name: string }[] } }[];
};

describe("program codec matches the program's IDL", () => {
  it("instruction and account discriminators", () => {
    const ix = (name: string) => Buffer.from(idl.instructions.find((i) => i.name === name)!.discriminator);
    const acct = (name: string) => Buffer.from(idl.accounts.find((a) => a.name === name)!.discriminator);
    assert.deepEqual(IX.stake, ix("stake"));
    assert.deepEqual(IX.resolve, ix("resolve"));
    assert.deepEqual(IX.expire, ix("expire"));
    assert.deepEqual(IX.payout, ix("payout"));
    assert.deepEqual(IX.refundPosition, ix("refund_position"));
    assert.deepEqual(IX.closeRoom, ix("close_room"));
    assert.deepEqual(IX.roomAccount, acct("Room"));
    assert.deepEqual(IX.positionAccount, acct("Position"));
  });

  it("struct field order the byte offsets assume", () => {
    const fields = (name: string) => idl.types.find((t) => t.name === name)!.type.fields.map((f) => f.name);
    assert.deepEqual(fields("StakeArgs"), ["room_id", "side", "amount_cents", "host", "fee_bps", "host_fee_bps", "lock_ts", "expiry_ts"]);
    assert.deepEqual(fields("Room"), [
      "room_id", "host", "fee_bps", "host_fee_bps", "lock_ts", "expiry_ts", "created_at", "yes_cents", "no_cents",
      "positions", "paid", "outcome", "refund_all", "rivaly_fee_cents", "host_fee_cents", "distributable_cents",
      "paid_out_cents", "dust_owner", "rent_payer", "bump", "vault_bump",
    ]);
    assert.deepEqual(fields("Position").slice(0, 2), ["room", "owner"]);
  });
});

describe("encoding", () => {
  it("stake args: 77 bytes, little-endian, uuid as 16 bytes", () => {
    const host = new PublicKey("7XBmYHxvBFe5XTpkoytxFKDbaMqxZrs4qcEjoNHnsfWJ");
    const b = encodeStakeArgs({
      roomId: "0a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9", side: "no", amountCents: 1234, host: host.toBase58(),
      feeBps: 300, hostFeeBps: 200, lockTs: 1_800_000_000, expiryTs: 1_801_209_600,
    });
    assert.equal(b.length, 77);
    assert.equal(b.subarray(0, 16).toString("hex"), "0a1b2c3d4e5f60718293a4b5c6d7e8f9");
    assert.equal(b[16], 2);
    assert.equal(b.readBigUInt64LE(17), BigInt(1234));
    assert.ok(b.subarray(25, 57).equals(host.toBuffer()));
    assert.equal(b.readUInt16LE(57), 300);
    assert.equal(b.readUInt16LE(59), 200);
    assert.equal(b.readBigInt64LE(61), BigInt(1_800_000_000));
    assert.equal(b.readBigInt64LE(69), BigInt(1_801_209_600));
  });

  it("rejects a non-uuid room id", () => {
    assert.throws(() => uuidBytes("not-a-uuid"));
  });

  it("decodes a Room account", () => {
    const b = Buffer.alloc(208);
    IX.roomAccount.copy(b, 0);
    b.writeUInt16LE(300, 56);
    b.writeUInt16LE(200, 58);
    b.writeBigInt64LE(BigInt(1_800_000_000), 60);
    b.writeBigUInt64LE(BigInt(1500), 84);
    b.writeBigUInt64LE(BigInt(2000), 92);
    b.writeUInt32LE(3, 100);
    b.writeUInt32LE(1, 104);
    b.writeUInt8(1, 108);
    b.writeBigUInt64LE(BigInt(60), 110);
    b.writeBigUInt64LE(BigInt(40), 118);
    b.writeBigUInt64LE(BigInt(3400), 126);
    const r = decodeRoom(b);
    assert.deepEqual(
      [r.feeBps, r.hostFeeBps, r.lockTs, r.yesCents, r.noCents, r.positions, r.paid, r.outcome, r.rivalyFeeCents, r.hostFeeCents, r.distributableCents, r.dustOwner],
      [300, 200, 1_800_000_000, 1500, 2000, 3, 1, "yes", 60, 40, 3400, null],
    );
    assert.throws(() => decodeRoom(Buffer.alloc(208)));
  });
});
