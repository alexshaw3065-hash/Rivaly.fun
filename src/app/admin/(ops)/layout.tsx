import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin/guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata: Metadata = { title: "Rivaly Ops", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Rivaly's internal operations area. Every page re-checks access on the
// server too (requireAdmin) — this layout is the first gate, not the only one.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="min-h-[100dvh] bg-background">
      <Suspense>
        <AdminSidebar name={me.displayName} role={me.role} />
      </Suspense>
      <div className="px-4 py-6 lg:pl-[256px] lg:pr-8">{children}</div>
    </div>
  );
}
