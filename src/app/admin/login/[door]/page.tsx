import { notFound } from "next/navigation";
import { doorMatches } from "@/lib/admin/session";
import { AdminLoginForm } from "./login-form";

// The ops-password sign-in, only at /admin/login/<ADMIN_LOGIN_PATH>. Any
// other door is the same 404 as any missing page.
export default async function AdminLoginPage({ params }: { params: Promise<{ door: string }> }) {
  const { door } = await params;
  if (!doorMatches(door)) notFound();
  return <AdminLoginForm door={door} />;
}
