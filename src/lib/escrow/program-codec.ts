// Byte layouts of the rivaly_rooms program (onchain/programs/rivaly_rooms):
// instruction discriminators, the stake arguments and the Room account.
// Pure, no network — program-codec.test.ts checks every discriminator
// against the program's IDL (onchain/idl/rivaly_rooms.json) and the Room
// layout against the Rust struct order.

import { PublicKey } from "@solana/web3.js";

const d = (bytes: number[]) => Buffer.from(bytes);

/** Anchor discriminators, from the IDL. */
export const IX = {
  stake: d([206, 176, 202, 18, 200, 209, 179, 108]),
  resolve: d([246, 150, 236, 206, 108, 63, 58, 10]),
  expire: d([243, 83, 205, 58, 57, 201, 247, 146]),
  payout: d([149, 140, 194, 236, 174, 189, 6, 239]),
  refundPosition: d([92, 200, 157, 98, 87, 187, 115, 172]),
  closeRoom: d([152, 197, 88, 192, 98, 197, 51, 211]),
  roomAccount: d([156, 199, 67, 27, 222, 23, 185, 94]),
  positionAccount: d([170, 188, 143, 228, 122, 64, 247, 208]),
};

export const OUTCOME = { open: 0, yes: 1, no: 2, void: 3 } as const;
export const SIDE = { yes: 1, no: 2 } as const;

/** A room uuid as the 16 bytes the program keys the room by. */
export function uuidBytes(uuid: string): Buffer {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error("not a uuid");
  return Buffer.from(hex, "hex");
}

export interface StakeArgsInput {
  roomId: string;
  side: "yes" | "no";
  amountCents: number;
  /** The host's wallet (recorded on-chain; fees still go to the treasury). */
  host: string;
  feeBps: number;
  hostFeeBps: number;
  /** Stakes close (kick-off), unix seconds. */
  lockTs: number;
  /** After this, anyone can void the room and refund everyone, unix seconds. */
  expiryTs: number;
}

/** Borsh: room_id[16] side u8 amount u64 host[32] fee u16 host_fee u16 lock i64 expiry i64. */
export function encodeStakeArgs(a: StakeArgsInput): Buffer {
  const out = Buffer.alloc(16 + 1 + 8 + 32 + 2 + 2 + 8 + 8);
  let o = 0;
  uuidBytes(a.roomId).copy(out, o);
  o += 16;
  out.writeUInt8(SIDE[a.side], o);
  o += 1;
  out.writeBigUInt64LE(BigInt(a.amountCents), o);
  o += 8;
  new PublicKey(a.host).toBuffer().copy(out, o);
  o += 32;
  out.writeUInt16LE(a.feeBps, o);
  o += 2;
  out.writeUInt16LE(a.hostFeeBps, o);
  o += 2;
  out.writeBigInt64LE(BigInt(a.lockTs), o);
  o += 8;
  out.writeBigInt64LE(BigInt(a.expiryTs), o);
  return out;
}

export interface ChainRoom {
  feeBps: number;
  hostFeeBps: number;
  lockTs: number;
  expiryTs: number;
  yesCents: number;
  noCents: number;
  positions: number;
  paid: number;
  outcome: "open" | "yes" | "no" | "void";
  refundAll: boolean;
  rivalyFeeCents: number;
  hostFeeCents: number;
  distributableCents: number;
  paidOutCents: number;
  dustOwner: PublicKey | null;
}

const OUTCOMES = ["open", "yes", "no", "void"] as const;

/** The Room account, field by field in the Rust struct's order. */
export function decodeRoom(data: Buffer | Uint8Array): ChainRoom {
  const b = Buffer.from(data);
  if (b.length < 208 || !b.subarray(0, 8).equals(IX.roomAccount)) throw new Error("not a Room account");
  const u64 = (o: number) => Number(b.readBigUInt64LE(o));
  const dust = new PublicKey(b.subarray(142, 174));
  return {
    feeBps: b.readUInt16LE(56),
    hostFeeBps: b.readUInt16LE(58),
    lockTs: Number(b.readBigInt64LE(60)),
    expiryTs: Number(b.readBigInt64LE(68)),
    yesCents: u64(84),
    noCents: u64(92),
    positions: b.readUInt32LE(100),
    paid: b.readUInt32LE(104),
    outcome: OUTCOMES[b.readUInt8(108)] ?? "open",
    refundAll: b.readUInt8(109) === 1,
    rivalyFeeCents: u64(110),
    hostFeeCents: u64(118),
    distributableCents: u64(126),
    paidOutCents: u64(134),
    dustOwner: dust.equals(PublicKey.default) ? null : dust,
  };
}
