"use client";

import type { ReactNode } from "react";
import { formatMoney } from "@/lib/mock-data";
import { MIN_STAKE_FLOOR_CENTS } from "@/lib/markets";
import { Segmented, Switch } from "./controls";

export interface RoomSettings {
  visibility: "public" | "private";
  limits: "none" | "set";
  // Whole USDC dollars as typed — digits only. Converted to cents at submit.
  minDollars: string;
  maxDollars: string;
  allowSpectators: boolean;
}

// Defaults are the fast path: public, open to any stake, spectators on.
// Most creators should be able to read this screen and just tap Continue.
export const DEFAULT_SETTINGS: RoomSettings = {
  visibility: "public",
  limits: "none",
  minDollars: "5",
  maxDollars: "100",
  allowSpectators: true,
};

export interface StakeLimits {
  minCents: number;
  maxCents: number | null;
  error: string | null;
}

export function stakeLimits(s: RoomSettings): StakeLimits {
  if (s.limits === "none") return { minCents: MIN_STAKE_FLOOR_CENTS, maxCents: null, error: null };
  const minCents = Number(s.minDollars || 0) * 100;
  const maxCents = Number(s.maxDollars || 0) * 100;
  let error: string | null = null;
  if (minCents < MIN_STAKE_FLOOR_CENTS) error = "Set a minimum above $0.";
  else if (maxCents < minCents) error = "Max has to be at least the minimum.";
  return { minCents, maxCents, error };
}

export function limitsLabel(l: StakeLimits): string {
  if (l.maxCents === null) return "No limit";
  return `${formatMoney(l.minCents)}–${formatMoney(l.maxCents)}`;
}

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 7);

export function RoomSettingsStep({ value, onChange }: { value: RoomSettings; onChange: (v: RoomSettings) => void }) {
  const set = <K extends keyof RoomSettings>(k: K, v: RoomSettings[K]) => onChange({ ...value, [k]: v });
  const limits = stakeLimits(value);

  return (
    <div className="flex flex-col gap-7">
      <Field label="Who can find it">
        <div role="radiogroup" aria-label="Visibility" className="grid grid-cols-2 gap-2">
          <VisibilityCard
            active={value.visibility === "public"}
            onClick={() => set("visibility", "public")}
            icon={<GlobeIcon />}
            title="Public"
            body="On feeds. Anyone can take the other side."
          />
          <VisibilityCard
            active={value.visibility === "private"}
            onClick={() => set("visibility", "private")}
            icon={<LockIcon />}
            title="Private"
            body="Invite code only. Just your people."
          />
        </div>
      </Field>

      <Field label="Stakes">
        <Segmented
          label="Stake limits"
          value={value.limits}
          onChange={(v) => set("limits", v)}
          options={[
            { value: "none", label: "No limit" },
            { value: "set", label: "Set min / max" },
          ]}
        />
        {value.limits === "none" ? (
          <Hint>Any amount. No minimum, no maximum — everyone stakes what they like.</Hint>
        ) : (
          <div className="enter-row mt-3">
            <div className="grid grid-cols-2 gap-2">
              <DollarInput label="Min" value={value.minDollars} onChange={(v) => set("minDollars", v)} invalid={Boolean(limits.error)} />
              <DollarInput label="Max" value={value.maxDollars} onChange={(v) => set("maxDollars", v)} invalid={Boolean(limits.error)} />
            </div>
            {limits.error ? (
              <p role="alert" className="mt-2 text-xs text-danger-red">
                {limits.error}
              </p>
            ) : (
              <Hint>Every entry, including yours, sits between these.</Hint>
            )}
          </div>
        )}
      </Field>

      {value.visibility === "public" && (
        <div className="enter-row flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3">
          <span className="text-muted" style={{ color: value.allowSpectators ? "var(--rival-blue)" : undefined }}>
            <EyeIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Allow spectators</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">People can follow the chat without joining.</p>
          </div>
          <Switch checked={value.allowSpectators} onChange={(v) => set("allowSpectators", v)} label="Allow spectators" />
        </div>
      )}
    </div>
  );
}

function VisibilityCard({
  active,
  onClick,
  icon,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className="hover-border flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.98]"
      style={{
        borderColor: active ? "var(--rival-blue)" : "var(--border)",
        background: active ? "var(--rival-blue-dim)" : "var(--surface)",
        boxShadow: active ? "inset 0 0 0 1px var(--rival-blue)" : "none",
      }}
    >
      <span style={{ color: active ? "var(--rival-blue)" : "var(--muted)" }}>{icon}</span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="text-xs leading-snug text-muted">{body}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-foreground">{label}</p>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs leading-relaxed text-muted">{children}</p>;
}

function DollarInput({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  return (
    <label
      className="flex min-h-12 items-center gap-1.5 rounded-md border bg-surface px-3 transition-colors duration-150 focus-within:border-rival-blue"
      style={{ borderColor: invalid ? "var(--danger-red)" : "var(--border)" }}
    >
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="ml-auto font-mono text-sm text-muted">$</span>
      <input
        aria-label={`${label} stake in USDC`}
        value={value ? Number(value).toLocaleString("en-US") : ""}
        onChange={(e) => onChange(digits(e.target.value))}
        inputMode="numeric"
        className="w-20 bg-transparent text-right font-mono text-sm text-foreground focus:outline-none"
      />
    </label>
  );
}

const iconProps = { viewBox: "0 0 20 20", width: 20, height: 20, fill: "none", "aria-hidden": true } as const;

function GlobeIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 10h14M10 3c2 2.2 2.9 4.5 2.9 7S12 14.8 10 17c-2-2.2-2.9-4.5-2.9-7S8 5.2 10 3Z" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4.5" y="8.5" width="11" height="8" rx="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 8.5V6.3a3 3 0 0 1 6 0v2.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="12.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2.5 10s2.7-5 7.5-5 7.5 5 7.5 5-2.7 5-7.5 5-7.5-5-7.5-5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
