// Server-only. A stake that reached a room's on-chain vault but couldn't be
// recorded (the room or entry write failed): the program sends it straight
// back to its owner. Used by submitStake and by settlement's stake recovery.

import type { createAdminClient } from "@/lib/supabase/admin";
import { sendSignedBatch } from "./escrow";
import { readChainRoom, signCloseRoom, signRefundPosition, signResolve } from "./program";

type Admin = ReturnType<typeof createAdminClient>;

interface IntentLike {
  id: string;
  kind: string;
  room_id: string | null;
  payload: unknown;
  wallet_address: string;
}

/** The room id if this stake intent went to the on-chain program, else null. */
export function programRoomOf(intent: Pick<IntentLike, "kind" | "room_id" | "payload">): string | null {
  const p = (intent.payload ?? {}) as Record<string, unknown>;
  if (intent.kind === "create") return p.p_custody === "program" && typeof p.p_room_id === "string" ? p.p_room_id : null;
  return p.custody === "program" ? (intent.room_id ?? (typeof p.p_room === "string" ? p.p_room : null)) : null;
}

/**
 * Refunds the intent's position from the room's vault. Returns the refund's
 * signature, or null when nothing could be refunded (the room is already
 * resolved — then settlement pays the position — or the send failed, and
 * recovery tries again). The signature is recorded before sending.
 */
export async function refundProgramStake(admin: Admin, intent: IntentLike): Promise<string | null> {
  const roomId = programRoomOf(intent);
  if (!roomId) return null;
  try {
    const chain = await readChainRoom(roomId);
    if (!chain || chain.outcome !== "open") return null;
    const batch = await signRefundPosition(roomId, intent.wallet_address);
    await admin.from("stake_intents").update({ error: `refund:${batch.signature}` }).eq("id", intent.id);
    await sendSignedBatch(batch);

    // A room that only ever existed on-chain (its first stake landed, the room
    // row never got written) is now empty: void and close it so its rent
    // comes back. Best effort — a leftover empty room holds no money.
    if (intent.kind === "create" && chain.positions <= 1) {
      const { data: row } = await admin.from("rooms").select("id").eq("id", roomId).maybeSingle();
      if (!row) {
        await sendSignedBatch(await signResolve(roomId, "void", null)).catch(() => undefined);
        const after = await readChainRoom(roomId).catch(() => null);
        if (after && after.outcome !== "open" && after.paid === after.positions) {
          await sendSignedBatch(await signCloseRoom(roomId, after)).catch(() => undefined);
        }
      }
    }
    return batch.signature;
  } catch {
    return null;
  }
}
