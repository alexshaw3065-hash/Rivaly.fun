import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasPasswordSession } from "./session";

// Who may use /admin, checked on the server for every page and every
// action — never trusted from the browser. Two ways in:
//   · the ops password (ADMIN_PASSWORD, signed session cookie) → owner
//   · a named admin account (the admins table) → its role
// Everyone else gets a 404 — the panel doesn't advertise itself. The
// password form is only at /admin/login/<ADMIN_LOGIN_PATH> (session.ts).
//
// Roles, each including the one below it:
//   moderator — reports, content, suspensions, notes, flags
//   admin     — + bans, room controls (void/refund, re-run settlement),
//               feature flags, limits
//   owner     — + fees, withdrawing Rivaly's fees, managing admins

export type AdminRole = "owner" | "admin" | "moderator";
const RANK: Record<AdminRole, number> = { moderator: 1, admin: 2, owner: 3 };

export interface AdminUser {
  /** The signed-in Rivaly account, if any (null under the ops password alone). */
  userId: string | null;
  /** How this admin got in, for the audit log. */
  via: "password" | "account";
  role: AdminRole;
  username: string;
  displayName: string;
}

export function atLeast(role: AdminRole, min: AdminRole): boolean {
  return RANK[role] >= RANK[min];
}

export async function getAdmin(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    password,
  ] = await Promise.all([supabase.auth.getUser(), hasPasswordSession()]);
  if (user) {
    const { data } = await createAdminClient().from("admins").select("role, profile:profiles!admins_user_id_fkey(username, display_name)").eq("user_id", user.id).maybeSingle();
    if (data) {
      const profile = data.profile as unknown as { username: string; display_name: string } | null;
      return { userId: user.id, via: "account", role: data.role as AdminRole, username: profile?.username ?? "admin", displayName: profile?.display_name ?? "Admin" };
    }
  }
  if (password) return { userId: user?.id ?? null, via: "password", role: "owner", username: "ops", displayName: "Ops" };
  return null;
}

/** For pages: the signed-in admin; otherwise a 404 (also for too low a role). */
export async function requireAdmin(min: AdminRole = "moderator"): Promise<AdminUser> {
  const a = await getAdmin();
  if (!a) notFound();
  if (!atLeast(a.role, min)) notFound();
  return a;
}

/** For server actions: the admin, or an error to show (never a redirect mid-action). */
export async function adminForAction(min: AdminRole): Promise<AdminUser | { error: string }> {
  const a = await getAdmin();
  if (!a) return { error: "Not allowed." };
  if (!atLeast(a.role, min)) return { error: `This needs the ${min} role.` };
  return a;
}
