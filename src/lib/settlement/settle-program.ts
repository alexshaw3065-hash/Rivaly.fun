// Server-only. Paying a room whose stakes are held by the on-chain program
// (custody 'program';). The decision (who won)
// is the same as for wallet rooms (settle.ts → decide); only the paying
// differs, and here the chain is the record of who's been paid:
//
//   1. resolve — tell the program the outcome (or void it past its expiry);
//   2. payout — every position still on-chain is paid by the program, which
//      computes the amount and closes the position, so a re-run or a racing
//      run can never pay anyone twice;
//   3. close — fees to the treasury, the rounding leftover to the named
//      winner, the vault and room closed. If one payout can't complete for a
//      day after the result (a frozen account), the fees are collected on
//      their own (collect_fees) and the room closes whenever that payout lands.
//
// The database mirrors it: entries get is_winner / payout_cents from the same
// planSettlement maths at the chain's frozen rates, fees go to room_fees, and
// the room is marked settled or refunded once the chain room is closed.

import type { createAdminClient } from "@/lib/supabase/admin";
import { sendSignedBatch } from "@/lib/escrow/escrow";
import {
  openPositionOwners,
  PROGRAM_PAYOUTS_PER_TX,
  readChainRoom,
  signCloseRoom,
  signCollectFees,
  signExpire,
  signPayouts,
  signResolve,
} from "@/lib/escrow/program";
import { planSettlement } from "./payouts";

type Admin = ReturnType<typeof createAdminClient>;
type State = "paying" | "settled" | "refunded";

interface ProgramRoom {
  id: string;
  creator_id: string;
}

interface EntryRow {
  id: string;
  side: "yes" | "no";
  amount_cents: number;
  profile: { dynamic_wallet_address: string | null } | null;
}

/** How long after the result a room still waiting on a payout has its fees collected on their own. */
const STUCK_FEES_AFTER_MS = 24 * 3_600_000;

export async function payProgramRoom(admin: Admin, room: ProgramRoom, decided: "yes" | "no" | "void", now = Date.now()): Promise<State> {
  const { data } = await admin
    .from("entries")
    .select("id, side, amount_cents, profile:profiles(dynamic_wallet_address)")
    .eq("room_id", room.id)
    .not("stake_tx_signature", "is", null)
    .order("created_at", { ascending: true });
  const entries = (data ?? []) as unknown as EntryRow[];
  const stakes = entries.map((e) => ({ id: e.id, side: e.side, amountCents: e.amount_cents }));
  const walletOf = new Map(entries.map((e) => [e.id, e.profile?.dynamic_wallet_address ?? null]));

  let chain = await readChainRoom(room.id);

  // 1. The result, once.
  if (chain && chain.outcome === "open") {
    if (now / 1000 >= chain.expiryTs) {
      await sendSignedBatch(await signExpire(room.id));
    } else {
      const rates = { rivalyBps: chain.feeBps, hostBps: chain.hostFeeBps };
      const plan = planSettlement(stakes, decided, rates);
      // The winner planSettlement gives the leftover cent to (largest stake, earliest on a tie).
      const winners = plan.payouts.filter((p) => p.isWinner === true);
      const largest = winners.length
        ? stakes.filter((s) => winners.some((w) => w.entryId === s.id)).reduce((a, b) => (b.amountCents > a.amountCents ? b : a))
        : null;
      const dustOwner = largest ? walletOf.get(largest.id) ?? null : null;
      if (largest && !dustOwner) {
        console.error(`[settlement] program room ${room.id}: the largest winner has no wallet address`);
        return "paying";
      }
      await sendSignedBatch(await signResolve(room.id, decided, dustOwner));
    }
    chain = await readChainRoom(room.id);
  }

  // The chain's outcome is the one that's paid (a room past its expiry is void
  // whatever the match said); the database follows it.
  const outcome = chain ? (chain.outcome === "open" ? null : chain.outcome) : decided;
  if (!outcome) return "paying";
  if (outcome !== decided) {
    await admin.from("rooms").update({ resolved_outcome: outcome }).eq("id", room.id);
  }

  // 2. Results in the database (idempotent: same frozen rates, same maths).
  const { data: r } = await admin.from("rooms").select("fee_bps, host_fee_bps").eq("id", room.id).maybeSingle();
  const rates = chain ? { rivalyBps: chain.feeBps, hostBps: chain.hostFeeBps } : { rivalyBps: r?.fee_bps ?? 0, hostBps: r?.host_fee_bps ?? 0 };
  const settlement = planSettlement(stakes, outcome, rates);
  await admin.from("rooms").update({ fee_plan: rates }).eq("id", room.id).is("fee_plan", null);
  for (const p of settlement.payouts) {
    await admin.from("entries").update({ is_winner: p.isWinner, payout_cents: p.cents }).eq("id", p.entryId);
  }
  // The fees, as the chain froze them (planSettlement's — the same numbers,
  // parity-tested — if the room is already closed or its fees were already
  // collected, which zeroes them on-chain); recorded only once they've
  // reached the treasury, below.
  const frozen = chain && chain.outcome !== "open" && chain.rivalyFeeCents + chain.hostFeeCents > 0 ? chain : null;
  const rivalyCents = frozen ? frozen.rivalyFeeCents : settlement.rivalyCents;
  const hostCents = frozen ? frozen.hostFeeCents : settlement.hostCents;
  const feeRows = [
    ...(rivalyCents > 0 ? [{ room_id: room.id, kind: "rivaly", recipient_id: null, cents: rivalyCents }] : []),
    ...(hostCents > 0 ? [{ room_id: room.id, kind: "host", recipient_id: room.creator_id, cents: hostCents }] : []),
  ];
  const recordFees = async () => {
    if (feeRows.length > 0) await admin.from("room_fees").upsert(feeRows, { onConflict: "room_id,kind", ignoreDuplicates: true });
  };

  // 3. Pay every position still on-chain (winners, losers and refunds alike:
  //    paying closes the position, and the room can only close once all are).
  if (chain) {
    const owners = await openPositionOwners(room.id);
    const entryIdsByWallet = new Map<string, string[]>();
    for (const e of entries) {
      const w = e.profile?.dynamic_wallet_address;
      if (w) entryIdsByWallet.set(w, [...(entryIdsByWallet.get(w) ?? []), e.id]);
    }
    const markPaid = async (paidOwners: typeof owners, signature: string) => {
      const ids = paidOwners.flatMap((o) => entryIdsByWallet.get(o.toBase58()) ?? []);
      const paidIds = ids.filter((id) => (settlement.payouts.find((p) => p.entryId === id)?.cents ?? 0) > 0);
      if (paidIds.length > 0) await admin.from("entries").update({ payout_tx_signature: signature }).in("id", paidIds);
    };
    for (let i = 0; i < owners.length; i += PROGRAM_PAYOUTS_PER_TX) {
      const chunk = owners.slice(i, i + PROGRAM_PAYOUTS_PER_TX);
      // A batch that fails is retried one person at a time, so one payout that
      // can't land (a frozen account) doesn't hold up everyone else in it.
      try {
        const batch = await signPayouts(room.id, chunk);
        await sendSignedBatch(batch);
        await markPaid(chunk, batch.signature);
      } catch {
        for (const one of chunk) {
          try {
            const batch = await signPayouts(room.id, [one]);
            await sendSignedBatch(batch);
            await markPaid([one], batch.signature);
          } catch {
            // left for the next run: the chain still has the position
          }
        }
      }
    }

    // 4. Close: fees to the treasury, leftover to the named winner.
    const afterPayouts = await readChainRoom(room.id);
    if (afterPayouts) {
      if (afterPayouts.paid !== afterPayouts.positions) {
        // Still someone unpaid a day after the result: take the fees now so
        // they aren't held by one payout that can't land; the room closes
        // once that last payout goes through.
        const { data: res } = await admin.from("rooms").select("resolved_at").eq("id", room.id).maybeSingle();
        const since = res?.resolved_at ? +new Date(res.resolved_at) : null;
        if (since !== null && now - since > STUCK_FEES_AFTER_MS && afterPayouts.rivalyFeeCents + afterPayouts.hostFeeCents > 0) {
          try {
            await sendSignedBatch(await signCollectFees(room.id));
            await recordFees();
          } catch (e) {
            console.error(`[settlement] program room ${room.id}: collect_fees failed`, e);
          }
        }
        return "paying";
      }
      try {
        await sendSignedBatch(await signCloseRoom(room.id, afterPayouts));
      } catch {
        return "paying";
      }
    }
  }

  // The room is closed on-chain, so its fees are in the treasury: now they
  // count (Rivaly's withdrawable, the host's claimable). Idempotent.
  await recordFees();

  const final: State = outcome === "void" || settlement.payouts.every((p) => p.isWinner === null) ? "refunded" : "settled";
  await admin.from("rooms").update({ status: final, settled_at: new Date().toISOString() }).eq("id", room.id).in("status", ["open", "live"]);
  return final;
}
