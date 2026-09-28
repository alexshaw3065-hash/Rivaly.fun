import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { db, displayName } from "@/lib/admin/data";
import { DataTable, PageHeader, Section, StatePill, Tabs, num, when, type Column } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/admin-forms";
import { resolveReport, restoreContent } from "@/app/admin/actions";

// Reports come here — nothing is taken down automatically (founder decision
// 2026-09-27). Each reported item appears once, with every report on it,
// the content itself and its author; a moderator removes it (hidden for
// everyone) or keeps it (reports closed). All reversible from "Removed".

const TABS = [
  { id: "reports", label: "Reports" },
  { id: "removed", label: "Removed content" },
  { id: "restricted", label: "Suspensions & bans" },
  { id: "history", label: "History" },
];

interface Report {
  target_kind: "post" | "message";
  target_id: string;
  reason: string;
  created_at: string;
  reporter_id: string;
}

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab = "reports" } = await searchParams;
  return (
    <div>
      <PageHeader title="Moderation" subtitle="Reports wait for a person to decide. Every decision is logged and reversible." />
      <Tabs tabs={TABS} active={tab} base="/admin/moderation" />
      {tab === "reports" && <Reports />}
      {tab === "removed" && <Removed />}
      {tab === "restricted" && <Restricted />}
      {tab === "history" && <History />}
    </div>
  );
}

async function Reports() {
  const admin = db();
  const { data } = await admin.from("content_reports").select("target_kind, target_id, reason, created_at, reporter_id").is("resolution", null).order("created_at", { ascending: false }).limit(500);
  const reports = (data ?? []) as Report[];
  const groups = new Map<string, Report[]>();
  for (const r of reports) groups.set(`${r.target_kind}:${r.target_id}`, [...(groups.get(`${r.target_kind}:${r.target_id}`) ?? []), r]);
  const postIds = reports.filter((r) => r.target_kind === "post").map((r) => r.target_id);
  const msgIds = reports.filter((r) => r.target_kind === "message").map((r) => r.target_id);
  const [{ data: posts }, { data: msgs }] = await Promise.all([
    postIds.length ? admin.from("posts").select("id, body, attachment, author_id, created_at, author:profiles!posts_author_id_fkey(username, display_name)").in("id", postIds) : Promise.resolve({ data: [] }),
    msgIds.length ? admin.from("messages").select("id, body, attachment, user_id, room_id, created_at, author:profiles!messages_user_id_fkey(username, display_name)").in("id", msgIds) : Promise.resolve({ data: [] }),
  ]);
  type Content = { id: string; body: string | null; attachment: { url?: string } | null; author_id?: string; user_id?: string; room_id?: string; created_at: string; author: { username: string; display_name: string } | null };
  const content = new Map<string, Content>([
    ...((posts ?? []) as unknown as Content[]).map((p) => [`post:${p.id}`, p] as const),
    ...((msgs ?? []) as unknown as Content[]).map((m) => [`message:${m.id}`, m] as const),
  ]);
  const items = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  if (items.length === 0) return <p className="rounded-card bg-surface px-4 py-10 text-center text-label text-secondary edge">No open reports.</p>;
  return (
    <div className="flex flex-col gap-3">
      {items.map(([key, rs]) => {
        const c = content.get(key);
        const [kind, id] = key.split(":") as ["post" | "message", string];
        const authorId = c?.author_id ?? c?.user_id;
        const reasons = [...new Set(rs.map((r) => r.reason))];
        return (
          <div key={key} className="rounded-card bg-surface p-4 edge">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-label">
                <span className="font-semibold text-[#f5a524]">
                  {rs.length} report{rs.length === 1 ? "" : "s"}
                </span>{" "}
                · {reasons.join(", ")} · {kind === "post" ? "Arena post" : "chat message"}
                {c?.room_id && (
                  <>
                    {" "}
                    in <Link href={`/admin/rooms/${c.room_id}`} className="underline">a room</Link>
                  </>
                )}
              </p>
              <p className="text-caption text-secondary">latest {when(rs[0].created_at)}</p>
            </div>
            {c ? (
              <div className="mt-3 rounded-control bg-background p-3 text-body">
                <p className="text-caption text-secondary">
                  {authorId ? <Link href={`/admin/users/${authorId}`} className="underline">{c.author ? displayName(c.author) : "author"}</Link> : "author"} · {when(c.created_at)}
                </p>
                {c.body && <p className="mt-1 whitespace-pre-wrap break-words text-foreground">{c.body}</p>}
                {c.attachment?.url && <p className="mt-1 text-caption text-secondary">[has an image/GIF attached]</p>}
              </div>
            ) : (
              <p className="mt-3 text-label text-secondary">The content was deleted by its author.</p>
            )}
            {c && (
              <div className="mt-3 flex flex-wrap gap-3">
                <ActionButton label="Remove for everyone" danger action={resolveReport.bind(null, kind, id, "removed")} />
                <ActionButton label="Keep it up" reason={false} action={resolveReport.bind(null, kind, id, "kept")} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

async function Removed() {
  const admin = db();
  const [{ data: posts }, { data: msgs }] = await Promise.all([
    admin.from("posts").select("id, body, hidden_at, author_id, author:profiles!posts_author_id_fkey(username, display_name)").not("hidden_at", "is", null).order("hidden_at", { ascending: false }).limit(100),
    admin.from("messages").select("id, body, hidden_at, user_id, author:profiles!messages_user_id_fkey(username, display_name)").not("hidden_at", "is", null).order("hidden_at", { ascending: false }).limit(100),
  ]);
  type Row = { kind: "post" | "message"; id: string; body: string | null; hidden_at: string; authorId: string; author: { username: string; display_name: string } | null };
  const rows: Row[] = [
    ...((posts ?? []) as unknown as { id: string; body: string | null; hidden_at: string; author_id: string; author: Row["author"] }[]).map((p) => ({ kind: "post" as const, id: p.id, body: p.body, hidden_at: p.hidden_at, authorId: p.author_id, author: p.author })),
    ...((msgs ?? []) as unknown as { id: string; body: string | null; hidden_at: string; user_id: string; author: Row["author"] }[]).map((m) => ({ kind: "message" as const, id: m.id, body: m.body, hidden_at: m.hidden_at, authorId: m.user_id, author: m.author })),
  ].sort((a, b) => +new Date(b.hidden_at) - +new Date(a.hidden_at));
  const cols: Column<Row>[] = [
    { label: "Removed", cell: (r) => <span className="text-secondary">{when(r.hidden_at)}</span> },
    { label: "Kind", cell: (r) => r.kind },
    { label: "Author", cell: (r) => <Link href={`/admin/users/${r.authorId}`} className="hover:underline">{r.author ? displayName(r.author) : "—"}</Link> },
    { label: "Content", cell: (r) => <span className="line-clamp-2 max-w-md text-caption text-secondary">{r.body ?? "[media]"}</span> },
    { label: "", cell: (r) => <ActionButton label="Restore" action={restoreContent.bind(null, r.kind, r.id)} /> },
  ];
  return <DataTable columns={cols} rows={rows} empty="Nothing has been removed." />;
}

async function Restricted() {
  const { data } = await db()
    .from("profiles")
    .select("id, username, display_name, suspended_until, banned_at, moderation_reason")
    .or(`banned_at.not.is.null,suspended_until.gt.${new Date().toISOString()}`)
    .limit(200);
  type R = { id: string; username: string; display_name: string; suspended_until: string | null; banned_at: string | null; moderation_reason: string | null };
  const cols: Column<R>[] = [
    { label: "User", cell: (r) => displayName(r) },
    { label: "Status", cell: (r) => <StatePill state={r.banned_at ? "banned" : "suspended"} /> },
    { label: "Until", cell: (r) => <span className="text-secondary">{r.banned_at ? "indefinitely" : when(r.suspended_until)}</span> },
    { label: "Reason", cell: (r) => <span className="text-caption text-secondary">{r.moderation_reason ?? "—"}</span> },
  ];
  return <DataTable columns={cols} rows={(data ?? []) as R[]} rowHref={(r) => `/admin/users/${r.id}`} empty="No one is suspended or banned." />;
}

async function History() {
  const { data } = await db()
    .from("admin_audit")
    .select("id, at, action, target_type, target_id, reason, admin:profiles!admin_audit_admin_id_fkey(username)")
    .in("target_type", ["user", "post", "message", "flag"])
    .order("at", { ascending: false })
    .limit(200);
  type R = { id: string; at: string; action: string; target_type: string; target_id: string | null; reason: string | null; admin: { username: string } | null };
  const cols: Column<R>[] = [
    { label: "When", cell: (r) => <span className="font-mono text-caption text-secondary">{when(r.at, "full")}</span> },
    { label: "Admin", cell: (r) => `@${r.admin?.username ?? "?"}` },
    { label: "Action", cell: (r) => r.action.replaceAll("_", " ") },
    { label: "Target", cell: (r) => (r.target_type === "user" && r.target_id ? <Link href={`/admin/users/${r.target_id}`} className="underline">user</Link> : r.target_type) },
    { label: "Reason", cell: (r) => <span className="text-caption text-secondary">{r.reason ?? "—"}</span> },
  ];
  return (
    <Section title={`${num((data ?? []).length)} moderation actions`}>
      <DataTable columns={cols} rows={(data ?? []) as unknown as R[]} empty="No moderation actions yet." />
    </Section>
  );
}
