import { atLeast, requireAdmin } from "@/lib/admin/guard";
import { db, displayName } from "@/lib/admin/data";
import { PageHeader, Section, Tabs, when } from "@/components/admin/ui";
import { AddAdminForm, FeesForm, FlagSwitch, LimitsForm, SignupGrantForm, SmallAction } from "@/components/admin/admin-forms";
import { addAdmin, removeAdmin, setFeatureFlag, updateFees, updateLimits, updateSignupGrant } from "@/app/admin/actions";
import { welcomeWalletStatus } from "@/lib/grants/signup";

// The controls: fees (owner), limits, feature flags (real switches the app
// enforces), and who can use this area. Every change asks for a reason and
// lands in the audit log.

/** Grant dollars sent (or in flight) since midnight UTC — the number the daily cap counts. */
async function sentToday(): Promise<number | null> {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const { data } = await db().from("signup_grants").select("cents").neq("status", "failed").gte("created_at", midnight.toISOString());
  return data ? data.reduce((t, g) => t + Number(g.cents), 0) : null;
}

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
        <p className="mb-3 text-label text-secondary">Each switch is enforced by the app and the database — turning one on takes effect immediately for everyone.</p>
        <div className="rounded-card bg-surface edge">
          {((flags ?? []) as { key: string; enabled: boolean; description: string; updated_at: string }[]).map((f) =>
            atLeast(me.role, "admin") ? (
              <FlagSwitch key={f.key} label={f.key} description={`${f.description} · changed ${when(f.updated_at)}`} enabled={f.enabled} action={setFeatureFlag.bind(null, f.key)} />
            ) : (
              <div key={f.key} className="border-b border-line px-4 py-3 text-label last:border-0">
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
        <div className="mb-4 rounded-card bg-surface edge">
          {((admins ?? []) as unknown as { user_id: string; role: string; created_at: string; profile: { username: string; display_name: string } | null }[]).map((a) => (
            <div key={a.user_id} className="flex items-center justify-between border-b border-line px-4 py-3 text-label last:border-0">
              <span>
                {a.profile ? displayName(a.profile) : "?"} <span className="text-secondary">@{a.profile?.username}</span> · <span className="text-foreground">{a.role}</span>
                <span className="text-secondary"> · since {when(a.created_at)}</span>
              </span>
              {atLeast(me.role, "owner") && a.user_id !== me.userId && <SmallAction label="remove" action={removeAdmin.bind(null, a.user_id)} />}
            </div>
          ))}
        </div>
        {atLeast(me.role, "owner") ? (
          <AddAdminForm action={addAdmin} />
        ) : (
          <p className="text-label text-secondary">Only an owner can add or remove admins.</p>
        )}
        <p className="mt-3 text-caption text-secondary">Moderator: reports, content, suspensions, notes, flags. Admin: + bans, room controls, feature flags, limits. Owner: + fees, withdrawing Rivaly&apos;s fees, admins.</p>
      </div>
    );
  }

  const [welcome, grantsToday] = await Promise.all([welcomeWalletStatus().catch(() => null), sentToday()]);
  const { data: s } = await admin.from("platform_settings").select("fees_enabled, rivaly_fee_bps, host_fee_bps, fee_wallet, max_stake_cents, signup_grant_enabled, signup_grant_cents, signup_grant_daily_cap_cents, updated_at").eq("id", true).maybeSingle();
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
            <p className="rounded-card bg-surface p-4 text-label edge">
              Fees {s?.fees_enabled ? "on" : "off"}: {(s?.rivaly_fee_bps ?? 0) / 100}% Rivaly + {(s?.host_fee_bps ?? 0) / 100}% host. Only an owner can change them.
            </p>
          )}
        </Section>
        <Section title="Limits">
          {atLeast(me.role, "admin") ? (
            <LimitsForm initialDollars={s?.max_stake_cents ? String(s.max_stake_cents / 100) : ""} action={updateLimits} />
          ) : (
            <p className="rounded-card bg-surface p-4 text-label edge">Largest stake: {s?.max_stake_cents ? `$${s.max_stake_cents / 100}` : "no cap"}.</p>
          )}
        </Section>
        <Section title="Sign-up grant" hint="Sent once per account and wallet from the welcome wallet (WELCOME_SECRET_KEY) — never escrow.">
          {!welcome && <p className="mb-3 text-caption text-danger-red">WELCOME_SECRET_KEY isn&apos;t set, so nothing is sent yet.</p>}
          {welcome && (
            <p className="mb-3 text-caption text-secondary">
              Welcome wallet {welcome.address.slice(0, 4)}…{welcome.address.slice(-4)}: ${(welcome.usdcCents / 100).toFixed(2)} USDC · {welcome.sol.toFixed(3)} SOL
              {grantsToday !== null && ` · $${(grantsToday / 100).toFixed(2)} sent today`}
            </p>
          )}
          {atLeast(me.role, "owner") ? (
            <SignupGrantForm
              initial={{ enabled: s?.signup_grant_enabled ?? true, dollars: String((s?.signup_grant_cents ?? 500) / 100), dailyCapDollars: String((s?.signup_grant_daily_cap_cents ?? 25000) / 100) }}
              action={updateSignupGrant}
            />
          ) : (
            <p className="rounded-card bg-surface p-4 text-label edge">
              {s?.signup_grant_enabled ? `New accounts get $${((s?.signup_grant_cents ?? 0) / 100).toFixed(2)}.` : "Off."} Only an owner can change it.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}
