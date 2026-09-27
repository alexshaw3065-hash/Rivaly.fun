import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Who may use /admin, checked on the server for every page and every
// action — never trusted from the browser. Non-admins get a plain 404, so
// the admin area doesn't even admit it exists.
//
// Roles, each including the one below it:
//   moderator — reports, content, suspensions, notes, flags
//   admin     — + bans, room controls (void/refund, re-run settlement),
//               feature flags, limits
//   owner     — + fees, withdrawing Rivaly's fees, managing admins

export type AdminRole = "owner" | "admin" | "moderator";
const RANK: Record<AdminRole, number> = { moderator: 1, admin: 2, owner: 3 };

export interface AdminUser {
  userId: string;
  role: AdminRole;
  username: string;
  displayName: string;
}

export function atLeast(role: AdminRole, min: AdminRole): boolean {
  return RANK[role] >= RANK[min];
}

export async function getAdmin(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("admins").select("role, profile:profiles!admins_user_id_fkey(username, display_name)").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  const profile = data.profile as unknown as { username: string; display_name: string } | null;
  return { userId: user.id, role: data.role as AdminRole, username: profile?.username ?? "admin", displayName: profile?.display_name ?? "Admin" };
}

/** For pages: the signed-in admin, or a 404. */
export async function requireAdmin(min: AdminRole = "moderator"): Promise<AdminUser> {
  const a = await getAdmin();
  if (!a || !atLeast(a.role, min)) notFound();
  return a;
}

/** For server actions: the admin, or an error to show (never a redirect mid-action). */
export async function adminForAction(min: AdminRole): Promise<AdminUser | { error: string }> {
  const a = await getAdmin();
  if (!a) return { error: "Not allowed." };
  if (!atLeast(a.role, min)) return { error: `This needs the ${min} role.` };
  return a;
}
