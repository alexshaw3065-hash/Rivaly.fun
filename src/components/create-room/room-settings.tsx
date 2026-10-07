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
  if (minCents < MIN_STAKE_FLOOR_CENTS) error = "The minimum stake is at least $1.";
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
    <div className="flex flex-col gap-8">
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
              <p role="alert" className="mt-2 text-caption text-no-ink">
                {limits.error}
              </p>
            ) : (
              <Hint>Every entry, including yours, sits between these.</Hint>
            )}
          </div>
        )}
      </Field>

      {value.visibility === "public" && (
        <div className="enter-row flex items-center gap-3 rounded-card bg-surface px-4 py-3 edge">
          <span className={value.allowSpectators ? "text-yes-ink" : "text-secondary"}>
            <EyeIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-foreground">Allow spectators</p>
            <p className="mt-1 text-caption leading-relaxed text-secondary">People can follow the chat without joining.</p>
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
      className={`flex flex-col items-start gap-2 rounded-card p-4 text-left outline -outline-offset-1 transition-[transform,background-color,outline-color] duration-100 ease-out active:scale-[0.98] ${
        active ? "bg-yes-tint outline-[1.5px] outline-yes" : "bg-surface outline-1 outline-line hover:bg-surface-elevated"
      }`}
    >
      <span className={active ? "text-yes-ink" : "text-secondary"}>{icon}</span>
      <span className="text-body font-semibold text-foreground">{title}</span>
      <span className="text-caption leading-snug text-secondary">{body}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-body font-semibold text-foreground">{label}</p>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-caption leading-relaxed text-secondary">{children}</p>;
}

function DollarInput({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  return (
    <label
      className={`flex h-12 items-center gap-1.5 rounded-control border bg-surface px-3 transition-colors duration-150 focus-within:border-yes ${invalid ? "border-no" : "border-line-strong"}`}
    >
      <span className="text-caption font-medium text-secondary">{label}</span>
      <span className="ml-auto text-body text-secondary">$</span>
      <input
        aria-label={`${label} stake in USDC`}
        value={value ? Number(value).toLocaleString("en-US") : ""}
        onChange={(e) => onChange(digits(e.target.value))}
        inputMode="numeric"
        className="w-20 bg-transparent text-right text-body-lg tabular-nums text-foreground focus:outline-none"
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
