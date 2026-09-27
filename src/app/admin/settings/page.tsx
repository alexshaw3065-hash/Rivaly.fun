import { atLeast, requireAdmin } from "@/lib/admin/guard";
import { db, displayName } from "@/lib/admin/data";
import { PageHeader, Section, Tabs, when } from "@/components/admin/ui";
import { AddAdminForm, FeesForm, FlagSwitch, LimitsForm, SmallAction } from "@/components/admin/admin-forms";
import { addAdmin, removeAdmin, setFeatureFlag, updateFees, updateLimits } from "@/app/admin/actions";

// The controls: fees (owner), limits, feature flags (real switches the app
// enforces), and who can use this area. Every change asks for a reason and
// lands in the audit log.

const TABS = [
  { id: "platform", label: "Fees & limits" },
  { id: "flags", label: "Feature flags" },
  { id: "admins", label: "Admins" },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireAdmin();
  const { tab = "platform" } = await searchParams;
  const admin = db();

  if (tab === "flags") {
    const { data: flags } = await admin.from("feature_flags").select("key, enabled, description, updated_at").order("key");
    return (
      <div>
        <PageHeader title="Settings" />
        <Tabs tabs={TABS} active={tab} base="/admin/settings" />
        <p className="mb-3 text-[13px] text-muted">Each switch is enforced by the app and the database — turning one on takes effect immediately for everyone.</p>
        <div className="rounded-xl bg-surface ring-1 ring-border">
          {((flags ?? []) as { key: string; enabled: boolean; description: string; updated_at: string }[]).map((f) =>
            atLeast(me.role, "admin") ? (
              <FlagSwitch key={f.key} label={f.key} description={`${f.description} · changed ${when(f.updated_at)}`} enabled={f.enabled} action={setFeatureFlag.bind(null, f.key)} />
            ) : (
              <div key={f.key} className="border-b border-border px-4 py-3 text-[13px] last:border-0">
                <span className="font-mono">{f.key}</span> — {f.enabled ? "ON" : "off"}
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  if (tab === "admins") {
    const { data: admins } = await admin.from("admins").select("user_id, role, created_at, profile:profiles!admins_user_id_fkey(username, display_name)").order("created_at");
    return (
      <div>
        <PageHeader title="Settings" />
        <Tabs tabs={TABS} active={tab} base="/admin/settings" />
        <div className="mb-4 rounded-xl bg-surface ring-1 ring-border">
          {((admins ?? []) as unknown as { user_id: string; role: string; created_at: string; profile: { username: string; display_name: string } | null }[]).map((a) => (
            <div key={a.user_id} className="flex items-center justify-between border-b border-border px-4 py-3 text-[13px] last:border-0">
              <span>
                {a.profile ? displayName(a.profile) : "?"} <span className="text-muted">@{a.profile?.username}</span> · <span className="text-foreground">{a.role}</span>
                <span className="text-muted"> · since {when(a.created_at)}</span>
              </span>
              {atLeast(me.role, "owner") && a.user_id !== me.userId && <SmallAction label="remove" action={removeAdmin.bind(null, a.user_id)} />}
            </div>
          ))}
        </div>
        {atLeast(me.role, "owner") ? (
          <AddAdminForm action={addAdmin} />
        ) : (
          <p className="text-[13px] text-muted">Only an owner can add or remove admins.</p>
        )}
        <p className="mt-3 text-[12px] text-muted">Moderator: reports, content, suspensions, notes, flags. Admin: + bans, room controls, feature flags, limits. Owner: + fees, withdrawing Rivaly&apos;s fees, admins.</p>
      </div>
    );
  }

  const { data: s } = await admin.from("platform_settings").select("fees_enabled, rivaly_fee_bps, host_fee_bps, fee_wallet, max_stake_cents, updated_at").eq("id", true).maybeSingle();
  return (
    <div>
      <PageHeader title="Settings" subtitle={s?.updated_at ? `Last changed ${when(s.updated_at)}` : undefined} />
      <Tabs tabs={TABS} active={tab} base="/admin/settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Fees">
          {atLeast(me.role, "owner") ? (
            <FeesForm
              initial={{ enabled: Boolean(s?.fees_enabled), rivalyBps: s?.rivaly_fee_bps ?? 300, hostBps: s?.host_fee_bps ?? 200, wallet: s?.fee_wallet ?? "" }}
              action={updateFees}
            />
          ) : (
            <p className="rounded-xl bg-surface p-4 text-[13px] ring-1 ring-border">
              Fees {s?.fees_enabled ? "on" : "off"}: {(s?.rivaly_fee_bps ?? 0) / 100}% Rivaly + {(s?.host_fee_bps ?? 0) / 100}% host. Only an owner can change them.
            </p>
          )}
        </Section>
        <Section title="Limits">
          {atLeast(me.role, "admin") ? (
            <LimitsForm initialDollars={s?.max_stake_cents ? String(s.max_stake_cents / 100) : ""} action={updateLimits} />
          ) : (
            <p className="rounded-xl bg-surface p-4 text-[13px] ring-1 ring-border">Largest stake: {s?.max_stake_cents ? `$${s.max_stake_cents / 100}` : "no cap"}.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
