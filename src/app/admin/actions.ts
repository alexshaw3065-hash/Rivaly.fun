"use server";

import { revalidatePath } from "next/cache";
import { adminForAction } from "@/lib/admin/guard";
import { recordAdminAction } from "@/lib/admin/audit";
import { db, eventContext, loadEvents } from "@/lib/admin/data";
import { describeEvent, type EventLine } from "@/lib/admin/events";
import { settleRoom } from "@/lib/settlement/settle";
import { escrowConfigured, sendSignedBatch, signPayoutBatch } from "@/lib/escrow/escrow";

// Every admin action: the role is re-checked here on the server, a reason
// is required for anything that affects a person or money, and each one is
// written to admin_audit + the event stream (recordAdminAction). Anything
// that moves money goes through the same settlement code the app uses.

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });
const needReason = (reason: string | undefined) => !reason || reason.trim().length < 3;

// ── Live stream ──────────────────────────────────────────────────────

export interface LiveItem extends EventLine {
  id: string;
  at: string;
  type: string;
  status: string;
}

export async function liveEvents(opts: { types?: string[] | null; limit?: number } = {}): Promise<LiveItem[]> {
  const me = await adminForAction("moderator");
  if ("error" in me) return [];
  const events = await loadEvents({ types: opts.types ?? undefined, limit: Math.min(opts.limit ?? 60, 200) });
  const ctx = await eventContext(events);
  return events.map((e) => ({ id: e.id, at: e.at, type: e.type, status: e.status, ...describeEvent(e, ctx) }));
}

// ── Users ────────────────────────────────────────────────────────────

export async function suspendUser(userId: string, days: number, reason: string): Promise<ActionResult> {
  const me = await adminForAction("moderator");
  if ("error" in me) return fail(me.error);
  if (needReason(reason)) return fail("Add a reason.");
  if (!Number.isFinite(days) || days < 1 || days > 365) return fail("Pick 1–365 days.");
  if (userId === me.userId) return fail("You can't suspend yourself.");
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  const { data: before } = await db().from("profiles").select("suspended_until, banned_at").eq("id", userId).maybeSingle();
  const { error } = await db().from("profiles").update({ suspended_until: until, moderation_reason: reason }).eq("id", userId);
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: "suspend_user", targetType: "user", targetId: userId, reason, before, after: { suspended_until: until }, userId, moderation: true });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: `Suspended for ${days} day${days === 1 ? "" : "s"}.` };
}

export async function banUser(userId: string, reason: string): Promise<ActionResult> {
  const me = await adminForAction("admin");
  if ("error" in me) return fail(me.error);
  if (needReason(reason)) return fail("Add a reason.");
  if (userId === me.userId) return fail("You can't ban yourself.");
  const now = new Date().toISOString();
  const { error } = await db().from("profiles").update({ banned_at: now, moderation_reason: reason }).eq("id", userId);
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: "ban_user", targetType: "user", targetId: userId, reason, after: { banned_at: now }, userId, moderation: true });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: "Banned. They can't stake, post or chat." };
}

export async function liftRestriction(userId: string, reason: string): Promise<ActionResult> {
  const { data: p } = await db().from("profiles").select("banned_at, suspended_until").eq("id", userId).maybeSingle();
  const me = await adminForAction(p?.banned_at ? "admin" : "moderator");
  if ("error" in me) return fail(me.error);
  if (needReason(reason)) return fail("Add a reason.");
  const { error } = await db().from("profiles").update({ banned_at: null, suspended_until: null, moderation_reason: null }).eq("id", userId);
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: "lift_restriction", targetType: "user", targetId: userId, reason, before: p, userId, moderation: true });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: "Restriction lifted." };
}

export async function addNote(userId: string, body: string): Promise<ActionResult> {
  const me = await adminForAction("moderator");
  if ("error" in me) return fail(me.error);
  const text = body.trim();
  if (!text) return fail("Write something.");
  const { error } = await db().from("admin_notes").insert({ user_id: userId, admin_id: me.userId, body: text.slice(0, 2000) });
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: "add_note", targetType: "user", targetId: userId, userId, moderation: true });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

const FLAGS = ["watch", "spam", "abuse", "fraud_risk", "multi_account", "other"];

export async function addFlag(userId: string, flag: string, note: string): Promise<ActionResult> {
  const me = await adminForAction("moderator");
  if ("error" in me) return fail(me.error);
  if (!FLAGS.includes(flag)) return fail("Unknown flag.");
  const { error } = await db().from("user_flags").insert({ user_id: userId, flag, note: note.trim() || null, admin_id: me.userId });
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: `flag_${flag}`, targetType: "user", targetId: userId, reason: note, userId, moderation: true });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function clearFlag(flagId: string, userId: string): Promise<ActionResult> {
  const me = await adminForAction("moderator");
  if ("error" in me) return fail(me.error);
  const { error } = await db().from("user_flags").update({ cleared_at: new Date().toISOString(), cleared_by: me.userId }).eq("id", flagId);
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: "clear_flag", targetType: "flag", targetId: flagId, userId, moderation: true });
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

// ── Moderation ───────────────────────────────────────────────────────

export async function resolveReport(kind: "post" | "message", targetId: string, resolution: "removed" | "kept", reason: string): Promise<ActionResult> {
  const me = await adminForAction("moderator");
  if ("error" in me) return fail(me.error);
  if (resolution === "removed" && needReason(reason)) return fail("Add a reason for removing it.");
  const table = kind === "post" ? "posts" : "messages";
  const authorCol = kind === "post" ? "author_id" : "user_id";
  const { data: target } = await db().from(table).select(`id, ${authorCol}, hidden_at`).eq("id", targetId).maybeSingle();
  if (!target) return fail("That content no longer exists.");
  if (resolution === "removed") {
    const { error } = await db().from(table).update({ hidden_at: new Date().toISOString() }).eq("id", targetId);
    if (error) return fail(error.message);
  }
  await db()
    .from("content_reports")
    .update({ resolution, resolved_at: new Date().toISOString(), resolved_by: me.userId })
    .eq("target_kind", kind)
    .eq("target_id", targetId)
    .is("resolution", null);
  const authorId = (target as Record<string, string | null>)[authorCol] ?? null;
  await recordAdminAction({ adminId: me.userId, action: resolution === "removed" ? `remove_${kind}` : `keep_${kind}`, targetType: kind, targetId, reason, userId: authorId, moderation: true });
  revalidatePath("/admin/moderation");
  return { ok: true, message: resolution === "removed" ? "Removed for everyone." : "Kept up. Reports closed." };
}

export async function restoreContent(kind: "post" | "message", targetId: string, reason: string): Promise<ActionResult> {
  const me = await adminForAction("moderator");
  if ("error" in me) return fail(me.error);
  if (needReason(reason)) return fail("Add a reason.");
  const { error } = await db().from(kind === "post" ? "posts" : "messages").update({ hidden_at: null }).eq("id", targetId);
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: `restore_${kind}`, targetType: kind, targetId, reason, moderation: true });
  revalidatePath("/admin/moderation");
  return { ok: true, message: "Restored." };
}

// ── Rooms / settlement ───────────────────────────────────────────────

/** Void a room: no result will be used, every stake is refunded by the normal payout run. */
export async function voidRoom(roomId: string, reason: string): Promise<ActionResult> {
  const me = await adminForAction("admin");
  if ("error" in me) return fail(me.error);
  if (needReason(reason)) return fail("Add a reason — it's shown in the audit log.");
  const { data: room } = await db().from("rooms").select("status, resolved_outcome, pending_outcome").eq("id", roomId).maybeSingle();
  if (!room) return fail("Room not found.");
  if (!["open", "live"].includes(room.status as string)) return fail(`This room is already ${room.status}.`);
  if (room.resolved_outcome) return fail(`This room already has a result (${room.resolved_outcome}) and is paying out.`);
  const { data: claimed } = await db()
    .from("rooms")
    .update({ resolved_outcome: "void", resolved_at: new Date().toISOString(), pending_outcome: null, pending_since: null })
    .eq("id", roomId)
    .is("resolved_outcome", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return fail("Settlement got there first — refresh.");
  await recordAdminAction({ adminId: me.userId, action: "void_room", targetType: "room", targetId: roomId, reason, before: room, after: { resolved_outcome: "void" }, roomId });
  // Start the refunds now rather than waiting for the next minute's run.
  const r = await settleRoom(roomId).catch((e) => ({ state: "skipped", detail: e instanceof Error ? e.message : String(e) }));
  revalidatePath(`/admin/rooms/${roomId}`);
  return { ok: true, message: `Voided. Refunds: ${r.state}${"detail" in r && r.detail ? ` (${r.detail})` : ""}.` };
}

export async function rerunSettlement(roomId: string): Promise<ActionResult> {
  const me = await adminForAction("admin");
  if ("error" in me) return fail(me.error);
  const r = await settleRoom(roomId).catch((e) => ({ roomId, state: "skipped" as const, detail: e instanceof Error ? e.message : String(e) }));
  await recordAdminAction({ adminId: me.userId, action: "rerun_settlement", targetType: "room", targetId: roomId, after: r, roomId });
  revalidatePath(`/admin/rooms/${roomId}`);
  return { ok: true, message: `Settlement ran: ${r.state}${r.detail ? ` — ${r.detail}` : ""}.` };
}

// ── Settings ─────────────────────────────────────────────────────────

export async function setFeatureFlag(key: string, enabled: boolean, reason: string): Promise<ActionResult> {
  const me = await adminForAction("admin");
  if ("error" in me) return fail(me.error);
  if (needReason(reason)) return fail("Add a reason.");
  const { data: before } = await db().from("feature_flags").select("enabled").eq("key", key).maybeSingle();
  if (!before) return fail("Unknown flag.");
  const { error } = await db().from("feature_flags").update({ enabled, updated_by: me.userId, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: `flag_${key}_${enabled ? "on" : "off"}`, targetType: "setting", targetId: key, reason, before, after: { enabled } });
  revalidatePath("/admin/settings");
  return { ok: true, message: `${key.replaceAll("_", " ")} is ${enabled ? "ON" : "off"}.` };
}

const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function updateFees(input: { enabled: boolean; rivalyBps: number; hostBps: number; wallet: string; reason: string }): Promise<ActionResult> {
  const me = await adminForAction("owner");
  if ("error" in me) return fail(me.error);
  if (needReason(input.reason)) return fail("Add a reason.");
  const ok = (n: number) => Number.isInteger(n) && n >= 0 && n <= 2500;
  if (!ok(input.rivalyBps) || !ok(input.hostBps)) return fail("Rates must be 0–25%.");
  const wallet = input.wallet.trim();
  if (wallet && !SOLANA_ADDRESS.test(wallet)) return fail("That isn't a Solana address.");
  const { data: before } = await db().from("platform_settings").select("fees_enabled, rivaly_fee_bps, host_fee_bps, fee_wallet").eq("id", true).maybeSingle();
  const after = { fees_enabled: input.enabled, rivaly_fee_bps: input.rivalyBps, host_fee_bps: input.hostBps, fee_wallet: wallet || null };
  const { error } = await db().from("platform_settings").update({ ...after, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: "update_fees", targetType: "fees", targetId: "platform", reason: input.reason, before, after });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Saved. Applies to rooms created from now on." };
}

export async function updateLimits(input: { maxStakeDollars: string; reason: string }): Promise<ActionResult> {
  const me = await adminForAction("admin");
  if ("error" in me) return fail(me.error);
  if (needReason(input.reason)) return fail("Add a reason.");
  const raw = input.maxStakeDollars.trim();
  const cents = raw === "" ? null : Math.round(Number(raw) * 100);
  if (cents !== null && (!Number.isFinite(cents) || cents <= 0)) return fail("Enter an amount, or leave it empty for no cap.");
  const { data: before } = await db().from("platform_settings").select("max_stake_cents").eq("id", true).maybeSingle();
  const { error } = await db().from("platform_settings").update({ max_stake_cents: cents, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: "update_limits", targetType: "setting", targetId: "max_stake_cents", reason: input.reason, before, after: { max_stake_cents: cents } });
  revalidatePath("/admin/settings");
  return { ok: true, message: cents === null ? "No platform stake cap." : `Stakes capped at $${(cents / 100).toFixed(2)}.` };
}

// ── Money out: Rivaly's fees ─────────────────────────────────────────

export async function withdrawRivalyFees(reason: string): Promise<ActionResult> {
  const me = await adminForAction("owner");
  if ("error" in me) return fail(me.error);
  if (needReason(reason)) return fail("Add a reason.");
  if (!escrowConfigured()) return fail("Escrow isn't configured on this deployment.");
  const { data: settings } = await db().from("platform_settings").select("fee_wallet").eq("id", true).maybeSingle();
  const wallet = settings?.fee_wallet as string | null;
  if (!wallet) return fail("Set Rivaly's fee wallet first.");
  const { data: started, error } = await db().rpc("start_rivaly_withdrawal", { p_admin: me.userId, p_wallet: wallet });
  if (error) {
    if (error.message.includes("withdrawal_in_progress")) return fail("A withdrawal is already on its way.");
    if (error.message.includes("nothing_to_withdraw")) return fail("Nothing to withdraw yet.");
    return fail(error.message);
  }
  const claim = (Array.isArray(started) ? started[0] : started) as { claim_id: string; cents: number };
  const cents = Number(claim.cents);
  let signed;
  try {
    signed = await signPayoutBatch([{ to: wallet, cents }]);
  } catch {
    await db().from("fee_claims").update({ status: "failed" }).eq("id", claim.claim_id).eq("status", "pending");
    return fail("Couldn't reach Solana — nothing was sent. Try again.");
  }
  await db().from("fee_claims").update({ status: "sent", payout_tx_signature: signed.signature, payout_valid_until_height: signed.lastValidBlockHeight }).eq("id", claim.claim_id);
  await recordAdminAction({ adminId: me.userId, action: "withdraw_rivaly_fees", targetType: "fees", targetId: claim.claim_id, reason, after: { cents, wallet, signature: signed.signature } });
  try {
    await sendSignedBatch(signed);
    await db().from("fee_claims").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", claim.claim_id);
  } catch {
    revalidatePath("/admin/finance");
    return { ok: true, message: `$${(cents / 100).toFixed(2)} sent — still confirming on Solana (checked every minute).` };
  }
  revalidatePath("/admin/finance");
  return { ok: true, message: `$${(cents / 100).toFixed(2)} withdrawn to ${wallet.slice(0, 4)}…${wallet.slice(-4)}.` };
}

// ── Admins ───────────────────────────────────────────────────────────

export async function addAdmin(username: string, role: "admin" | "moderator" | "owner"): Promise<ActionResult> {
  const me = await adminForAction("owner");
  if ("error" in me) return fail(me.error);
  if (!["owner", "admin", "moderator"].includes(role)) return fail("Unknown role.");
  const { data: p } = await db().from("profiles").select("id").eq("username", username.trim().replace(/^@/, "")).maybeSingle();
  if (!p) return fail("No user with that username.");
  const { error } = await db().from("admins").upsert({ user_id: p.id, role, added_by: me.userId });
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: `grant_${role}`, targetType: "admin", targetId: p.id as string, userId: p.id as string });
  revalidatePath("/admin/settings");
  return { ok: true, message: `@${username.replace(/^@/, "")} is now ${role}.` };
}

export async function removeAdmin(userId: string): Promise<ActionResult> {
  const me = await adminForAction("owner");
  if ("error" in me) return fail(me.error);
  if (userId === me.userId) return fail("You can't remove yourself.");
  const { count } = await db().from("admins").select("user_id", { count: "exact", head: true }).eq("role", "owner");
  const { data: target } = await db().from("admins").select("role").eq("user_id", userId).maybeSingle();
  if (target?.role === "owner" && (count ?? 0) <= 1) return fail("There must always be one owner.");
  const { error } = await db().from("admins").delete().eq("user_id", userId);
  if (error) return fail(error.message);
  await recordAdminAction({ adminId: me.userId, action: "revoke_admin", targetType: "admin", targetId: userId, before: target, userId });
  revalidatePath("/admin/settings");
  return { ok: true };
}
