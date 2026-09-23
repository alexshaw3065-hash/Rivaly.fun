"use client";

import { formatMoney } from "@/lib/mock-data";
import { MIN_STAKE_FLOOR_CENTS } from "@/lib/markets";
import { Segmented, Switch } from "./controls";

export interface RoomSettings {
  visibility: "public" | "private";
  limits: "none" | "set";
  // Whole naira as typed — digits only. Converted to kobo at submit.
  minNaira: string;
  maxNaira: string;
  allowSpectators: boolean;
}

// Defaults are the fast path: public, open to any stake, spectators on.
// Most creators should be able to read this screen and just tap Continue.
export const DEFAULT_SETTINGS: RoomSettings = {
  visibility: "public",
  limits: "none",
  minNaira: "500",
  maxNaira: "10000",
  allowSpectators: true,
};

export interface StakeLimits {
  minCents: number;
  maxCents: number | null;
  error: string | null;
}

export function stakeLimits(s: RoomSettings): StakeLimits {
  if (s.limits === "none") return { minCents: MIN_STAKE_FLOOR_CENTS, maxCents: null, error: null };
  const minCents = Number(s.minNaira || 0) * 100;
  const maxCents = Number(s.maxNaira || 0) * 100;
  let error: string | null = null;
  if (minCents < MIN_STAKE_FLOOR_CENTS) error = `Minimum can't go below ${formatMoney(MIN_STAKE_FLOOR_CENTS)}.`;
  else if (maxCents < minCents) error = "Max has to be at least the minimum.";
  return { minCents, maxCents, error };
}

export function limitsLabel(l: StakeLimits): string {
  return l.maxCents === null ? `From ${formatMoney(l.minCents)}` : `${formatMoney(l.minCents)}–${formatMoney(l.maxCents)}`;
}

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 9);

export function RoomSettingsStep({ value, onChange }: { value: RoomSettings; onChange: (v: RoomSettings) => void }) {
  const set = <K extends keyof RoomSettings>(k: K, v: RoomSettings[K]) => onChange({ ...value, [k]: v });
  const limits = stakeLimits(value);

  return (
    <div className="flex flex-col gap-7">
      <Field label="Who can find it">
        <Segmented
          label="Visibility"
          value={value.visibility}
          onChange={(v) => set("visibility", v)}
          options={[
            { value: "public", label: "Public" },
            { value: "private", label: "Private" },
          ]}
        />
        <Hint>
          {value.visibility === "public"
            ? "Anyone can find this room and take the other side."
            : "Hidden from feeds. Only people with your invite code get in."}
        </Hint>
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
          <Hint>Anyone can back their side with {formatMoney(MIN_STAKE_FLOOR_CENTS)} or more.</Hint>
        ) : (
          <div className="enter-row mt-3">
            <div className="grid grid-cols-2 gap-2">
              <NairaInput label="Min stake" value={value.minNaira} onChange={(v) => set("minNaira", v)} />
              <NairaInput label="Max stake" value={value.maxNaira} onChange={(v) => set("maxNaira", v)} />
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
        <div className="enter-row flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Allow spectators</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">People can follow the chat without joining.</p>
          </div>
          <Switch checked={value.allowSpectators} onChange={(v) => set("allowSpectators", v)} label="Allow spectators" />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-medium text-foreground">{label}</p>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs leading-relaxed text-muted">{children}</p>;
}

function NairaInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-h-12 items-center gap-1.5 rounded-md border border-border bg-surface px-3 transition-colors duration-150 focus-within:border-border-strong">
      <span className="sr-only">{label}</span>
      <span className="text-xs text-muted">{label.split(" ")[0]}</span>
      <span className="ml-auto font-mono text-sm text-muted">₦</span>
      <input
        value={value ? Number(value).toLocaleString("en-NG") : ""}
        onChange={(e) => onChange(digits(e.target.value))}
        inputMode="numeric"
        className="w-20 bg-transparent text-right font-mono text-sm text-foreground focus:outline-none"
      />
    </label>
  );
}
