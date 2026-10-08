// Server-only. Rooms with on-chain custody: their stakes sit in the
// rivaly_rooms program (onchain/), one vault per room, and only the program's
// rules can move them — winnings and refunds to the people who staked, fees
// to the treasury. This module builds those instructions; the escrow key
// signs them as the program's operator and fee payer.
// docs/plans/onchain-escrow.md.

import {
  ComputeBudgetProgram,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import bs58 from "bs58";
import { RIVALY_ROOMS_PROGRAM_ID, USDC_MINT } from "@/lib/wallet/constants";
import { escrowSigner, type PreparedStake, type SignedBatch } from "./escrow";
import { decodeRoom, encodeStakeArgs, IX, OUTCOME, uuidBytes, type ChainRoom, type StakeArgsInput } from "./program-codec";

export type { ChainRoom };

const PROGRAM = new PublicKey(RIVALY_ROOMS_PROGRAM_ID);
const MINT = new PublicKey(USDC_MINT);
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
/** Payouts per transaction: each adds 3 accounts; 5 stays well inside the 1232-byte limit. */
export const PROGRAM_PAYOUTS_PER_TX = 5;
/** After this long past kick-off an unresolved room can be voided by anyone (the program's expiry). */
export const ROOM_EXPIRY_SECONDS = 14 * 86_400;
// The program's own ceilings (onchain/programs/rivaly_rooms/src/lib.rs); a
// first stake outside them is refused on-chain, so the app checks first.
/** Rivaly's fee and the host's together, in basis points of the winners' profit. */
export const PROGRAM_MAX_TOTAL_FEE_BPS = 600;
/** How far ahead of a room's first stake its stakes can close (kick-off). */
export const PROGRAM_MAX_LOCK_AHEAD_SECONDS = 180 * 86_400;

export const configPda = () => PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM)[0];
export const roomPda = (roomId: string) => PublicKey.findProgramAddressSync([Buffer.from("room"), uuidBytes(roomId)], PROGRAM)[0];
export const vaultPda = (room: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from("vault"), room.toBuffer()], PROGRAM)[0];
export const positionPda = (room: PublicKey, owner: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("position"), room.toBuffer(), owner.toBuffer()], PROGRAM)[0];

const ro = (pubkey: PublicKey) => ({ pubkey, isSigner: false, isWritable: false });
const rw = (pubkey: PublicKey) => ({ pubkey, isSigner: false, isWritable: true });

/** The program's stake instruction plus a memo tying it to one stake intent; the escrow pays the fee. */
export async function buildProgramStakeTransaction(userAddress: string, intentId: string, args: StakeArgsInput): Promise<PreparedStake> {
  const { keypair, connection } = escrowSigner();
  const user = new PublicKey(userAddress);
  const room = roomPda(args.roomId);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const stake = new TransactionInstruction({
    programId: PROGRAM,
    data: Buffer.concat([IX.stake, encodeStakeArgs(args)]),
    keys: [
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
      ro(configPda()),
      ro(MINT),
      rw(room),
      rw(vaultPda(room)),
      rw(positionPda(room, user)),
      rw(getAssociatedTokenAddressSync(MINT, user)),
      ro(TOKEN_PROGRAM_ID),
      ro(SystemProgram.programId),
    ],
  });
  const tx = new Transaction({ feePayer: keypair.publicKey, blockhash, lastValidBlockHeight });
  tx.add(stake, new TransactionInstruction({ programId: MEMO_PROGRAM_ID, keys: [], data: Buffer.from(`rivaly:stake:${intentId}`) }));
  return {
    transactionBase64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    messageBase64: tx.serializeMessage().toString("base64"),
    lastValidBlockHeight,
  };
}

/** The room's on-chain state, or null if it was never opened or is already closed. */
export async function readChainRoom(roomId: string): Promise<ChainRoom | null> {
  const { connection } = escrowSigner();
  const info = await connection.getAccountInfo(roomPda(roomId), "confirmed");
  if (!info || !info.owner.equals(PROGRAM)) return null;
  return decodeRoom(info.data);
}

/** Owners of the room's positions still on-chain (unpaid). Decided from the chain, not the database. */
export async function openPositionOwners(roomId: string): Promise<PublicKey[]> {
  const { connection } = escrowSigner();
  const room = roomPda(roomId);
  const accounts = await connection.getProgramAccounts(PROGRAM, {
    commitment: "confirmed",
    filters: [{ memcmp: { offset: 0, bytes: bs58.encode(IX.positionAccount) } }, { memcmp: { offset: 8, bytes: room.toBase58() } }],
  });
  // Position: discriminator(8) room(32) owner(32) …
  return accounts.map((a) => new PublicKey(a.account.data.subarray(40, 72)));
}

async function signed(instructions: TransactionInstruction[], computeUnits?: number): Promise<SignedBatch> {
  const { keypair, connection } = escrowSigner();
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: keypair.publicKey, blockhash, lastValidBlockHeight });
  if (computeUnits) tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }));
  tx.add(...instructions);
  tx.sign(keypair);
  return { payouts: [], signature: bs58.encode(tx.signature!), serialized: tx.serialize().toString("base64"), blockhash, lastValidBlockHeight };
}

/** The result. `dustOwner` = the wallet of the winner who takes the rounding leftover (null when nobody wins). */
export function signResolve(roomId: string, outcome: "yes" | "no" | "void", dustOwner: string | null): Promise<SignedBatch> {
  const { keypair } = escrowSigner();
  const room = roomPda(roomId);
  return signed([
    new TransactionInstruction({
      programId: PROGRAM,
      data: Buffer.concat([IX.resolve, Buffer.from([OUTCOME[outcome]])]),
      keys: [
        { pubkey: keypair.publicKey, isSigner: true, isWritable: false },
        ro(configPda()),
        rw(room),
        // Anchor's optional account: the program id itself stands for "none".
        ro(dustOwner ? positionPda(room, new PublicKey(dustOwner)) : PROGRAM),
      ],
    }),
  ]);
}

/** Past the room's expiry: void it so everyone is refunded. Anyone may send this; the escrow pays the fee. */
export function signExpire(roomId: string): Promise<SignedBatch> {
  return signed([new TransactionInstruction({ programId: PROGRAM, data: IX.expire, keys: [rw(roomPda(roomId))] })]);
}

function payoutIx(room: PublicKey, owner: PublicKey, payer: PublicKey, instruction: Buffer): TransactionInstruction {
  return new TransactionInstruction({
    programId: PROGRAM,
    data: instruction,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      ro(configPda()),
      ro(MINT),
      rw(room),
      rw(vaultPda(room)),
      rw(positionPda(room, owner)),
      ro(owner),
      rw(getAssociatedTokenAddressSync(MINT, owner)),
      rw(payer), // rent payer: the escrow paid each position's rent
      ro(TOKEN_PROGRAM_ID),
      ro(ASSOCIATED_TOKEN_PROGRAM_ID),
      ro(SystemProgram.programId),
    ],
  });
}

/** Pays up to PROGRAM_PAYOUTS_PER_TX positions; the program computes each amount and closes the position. */
export function signPayouts(roomId: string, owners: PublicKey[]): Promise<SignedBatch> {
  const { keypair } = escrowSigner();
  const room = roomPda(roomId);
  return signed(owners.map((o) => payoutIx(room, o, keypair.publicKey, IX.payout)), 400_000);
}

/** Before a result: send one stake back to its owner (it landed but couldn't be recorded). */
export function signRefundPosition(roomId: string, owner: string): Promise<SignedBatch> {
  const { keypair } = escrowSigner();
  // Same accounts as payout, with the operator first as signer.
  return signed([payoutIx(roomPda(roomId), new PublicKey(owner), keypair.publicKey, IX.refundPosition)]);
}

/** After everyone is paid: fees to the treasury, the leftover to the named winner, vault and room closed. */
export function signCloseRoom(roomId: string, chain: ChainRoom): Promise<SignedBatch> {
  const { keypair } = escrowSigner();
  const room = roomPda(roomId);
  const dust = chain.dustOwner;
  return signed([
    new TransactionInstruction({
      programId: PROGRAM,
      data: IX.closeRoom,
      keys: [
        ro(configPda()),
        ro(MINT),
        rw(room),
        rw(vaultPda(room)),
        // The treasury is the escrow wallet (the program's config).
        rw(getAssociatedTokenAddressSync(MINT, keypair.publicKey)),
        dust ? rw(getAssociatedTokenAddressSync(MINT, dust)) : ro(PROGRAM),
        rw(keypair.publicKey),
        ro(TOKEN_PROGRAM_ID),
      ],
    }),
  ]);
}
