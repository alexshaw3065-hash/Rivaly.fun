import { createAdminClient } from "@/lib/supabase/admin";

// Every admin action leaves two traces: a row in admin_audit (who, what,
// why, before → after) and an event in the live stream, so it shows up on
// the target's timeline too.

export async function recordAdminAction(opts: {
  adminId: string | null;
  /** "password" or "account" — how the admin signed in. */
  via?: "password" | "account";
  action: string;
  targetType: "user" | "room" | "post" | "message" | "setting" | "flag" | "admin" | "fees";
  targetId: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  /** Links the stream event to a user/room so it lands on their timeline. */
  userId?: string | null;
  roomId?: string | null;
  moderation?: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  await Promise.all([
    admin.from("admin_audit").insert({
      admin_id: opts.adminId,
      admin_label: opts.via === "password" ? "ops password" : null,
      action: opts.action,
      target_type: opts.targetType,
      target_id: opts.targetId,
      reason: opts.reason ?? null,
      before: opts.before ?? null,
      after: opts.after ?? null,
    }),
    admin.from("platform_events").insert({
      type: opts.moderation ? "MODERATION_ACTION" : "ADMIN_ACTION",
      user_id: opts.userId ?? null,
      room_id: opts.roomId ?? null,
      source: "admin",
      metadata: { action: opts.action, target_type: opts.targetType, target_id: opts.targetId, reason: opts.reason ?? null, by: opts.adminId },
    }),
  ]);
}
