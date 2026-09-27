"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/admin/actions";

// Admin action controls. Anything that affects a person or money asks for
// a reason (it goes to the audit log) and, when it's serious, a typed
// confirmation — no one-click accidents.

function Result({ r }: { r: ActionResult | null }) {
  if (!r) return null;
  return <p className={`mt-2 text-[12px] ${r.ok ? "text-rival-green" : "text-rival-red"}`}>{r.ok ? r.message ?? "Done." : r.error}</p>;
}

const input = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-border-strong";
const btn = (danger?: boolean) =>
  `h-8 rounded-md px-3 text-[12px] font-semibold transition-opacity disabled:opacity-40 ${danger ? "bg-[var(--rival-red)] text-white" : "bg-foreground text-background"}`;

/** A button that opens a reason box, then runs the action. `confirmWord` requires typing it. */
export function ActionButton({
  label,
  action,
  danger,
  reason = true,
  confirmWord,
  help,
}: {
  label: string;
  action: (reason: string) => Promise<ActionResult>;
  danger?: boolean;
  reason?: boolean;
  confirmWord?: string;
  help?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const ready = (!reason || text.trim().length >= 3) && (!confirmWord || typed.trim().toUpperCase() === confirmWord);

  if (!open) {
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)} className={btn(danger)}>
          {label}
        </button>
        <Result r={result} />
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      {help && <p className="mb-2 text-[12px] text-muted">{help}</p>}
      {reason && <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Reason (saved to the audit log)" rows={2} className={input} />}
      {confirmWord && (
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`Type ${confirmWord} to confirm`} className={`${input} mt-2`} />
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={!ready || pending}
          onClick={() =>
            start(async () => {
              const r = await action(text.trim());
              setResult(r);
              if (r.ok) {
                setOpen(false);
                setText("");
                setTyped("");
              }
            })
          }
          className={btn(danger)}
        >
          {pending ? "Working…" : label}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-8 rounded-md px-3 text-[12px] text-muted">
          Cancel
        </button>
      </div>
      <Result r={result} />
    </div>
  );
}

export function SuspendForm({ action }: { action: (days: number, reason: string) => Promise<ActionResult> }) {
  const [days, setDays] = useState("7");
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-[12px] text-muted">
        Days
        <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} className={`${input} w-20`} inputMode="numeric" />
      </label>
      <ActionButton label="Suspend" action={(reason) => action(Number(days), reason)} />
    </div>
  );
}

export function NoteForm({ action }: { action: (body: string) => Promise<ActionResult> }) {
  const [body, setBody] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Private note for admins" rows={2} className={input} />
      <button
        type="button"
        disabled={!body.trim() || pending}
        onClick={() =>
          start(async () => {
            const r = await action(body);
            setResult(r);
            if (r.ok) setBody("");
          })
        }
        className={`${btn()} mt-2`}
      >
        Add note
      </button>
      <Result r={result} />
    </div>
  );
}

export function FlagForm({ action }: { action: (flag: string, note: string) => Promise<ActionResult> }) {
  const [flag, setFlag] = useState("watch");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <select value={flag} onChange={(e) => setFlag(e.target.value)} className={input}>
        {["watch", "spam", "abuse", "fraud_risk", "multi_account", "other"].map((f) => (
          <option key={f} value={f}>
            {f.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why (optional)" className={input} />
      <button type="button" disabled={pending} onClick={() => start(async () => setResult(await action(flag, note)))} className={btn()}>
        Add flag
      </button>
      <Result r={result} />
    </div>
  );
}

export function SmallAction({ label, action }: { label: string; action: () => Promise<ActionResult> }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <span>
      <button type="button" disabled={pending} onClick={() => start(async () => setResult(await action()))} className="text-[12px] text-muted underline hover:text-foreground disabled:opacity-40">
        {pending ? "…" : label}
      </button>
      {result && !result.ok && <span className="ml-2 text-[12px] text-rival-red">{result.error}</span>}
    </span>
  );
}

export function FlagSwitch({ label, description, enabled, action }: { label: string; description: string; enabled: boolean; action: (on: boolean, reason: string) => Promise<ActionResult> }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
      <div className="min-w-0">
        <p className="font-mono text-[13px] text-foreground">{label}</p>
        <p className="mt-0.5 text-[12px] text-muted">{description}</p>
        <p className="mt-1 text-[12px]" style={{ color: enabled ? "var(--rival-red)" : "var(--muted)" }}>
          {enabled ? "ON — in effect now" : "Off"}
        </p>
      </div>
      <ActionButton label={enabled ? "Turn off" : "Turn on"} danger={!enabled} action={(reason) => action(!enabled, reason)} />
    </div>
  );
}

export function FeesForm({
  initial,
  action,
}: {
  initial: { enabled: boolean; rivalyBps: number; hostBps: number; wallet: string };
  action: (v: { enabled: boolean; rivalyBps: number; hostBps: number; wallet: string; reason: string }) => Promise<ActionResult>;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [rivaly, setRivaly] = useState(String(initial.rivalyBps / 100));
  const [host, setHost] = useState(String(initial.hostBps / 100));
  const [wallet, setWallet] = useState(initial.wallet);
  const toBps = (s: string) => Math.round(Number(s) * 100);
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 ring-1 ring-border">
      <label className="flex items-center gap-2 text-[13px] text-foreground">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Fees on for new rooms
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[12px] text-muted">
          Rivaly % of winners&apos; profit
          <input value={rivaly} onChange={(e) => setRivaly(e.target.value)} className={`${input} mt-1`} inputMode="decimal" />
        </label>
        <label className="text-[12px] text-muted">
          Host % of winners&apos; profit
          <input value={host} onChange={(e) => setHost(e.target.value)} className={`${input} mt-1`} inputMode="decimal" />
        </label>
      </div>
      <label className="text-[12px] text-muted">
        Rivaly fee wallet (public address — never a private key)
        <input value={wallet} onChange={(e) => setWallet(e.target.value)} className={`${input} mt-1 font-mono`} />
      </label>
      <ActionButton label="Save fees" action={(reason) => action({ enabled, rivalyBps: toBps(rivaly), hostBps: toBps(host), wallet, reason })} help="Applies only to rooms created after saving — open rooms keep the rates they were created with." />
    </div>
  );
}

export function LimitsForm({ initialDollars, action }: { initialDollars: string; action: (v: { maxStakeDollars: string; reason: string }) => Promise<ActionResult> }) {
  const [max, setMax] = useState(initialDollars);
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 ring-1 ring-border">
      <label className="text-[12px] text-muted">
        Largest single stake, in dollars (empty = no cap)
        <input value={max} onChange={(e) => setMax(e.target.value)} className={`${input} mt-1`} inputMode="decimal" />
      </label>
      <ActionButton label="Save limit" action={(reason) => action({ maxStakeDollars: max, reason })} />
    </div>
  );
}

export function SignupGrantForm({
  initial,
  action,
}: {
  initial: { enabled: boolean; dollars: string; dailyCapDollars: string };
  action: (v: { enabled: boolean; dollars: string; dailyCapDollars: string; reason: string }) => Promise<ActionResult>;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [dollars, setDollars] = useState(initial.dollars);
  const [cap, setCap] = useState(initial.dailyCapDollars);
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 ring-1 ring-border">
      <label className="flex items-center gap-2 text-[13px] text-foreground">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Give new accounts a starting balance
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[12px] text-muted">
          Per account ($)
          <input value={dollars} onChange={(e) => setDollars(e.target.value)} className={`${input} mt-1`} inputMode="decimal" />
        </label>
        <label className="text-[12px] text-muted">
          Daily total cap ($)
          <input value={cap} onChange={(e) => setCap(e.target.value)} className={`${input} mt-1`} inputMode="decimal" />
        </label>
      </div>
      <ActionButton label="Save grant" action={(reason) => action({ enabled, dollars, dailyCapDollars: cap, reason })} />
    </div>
  );
}

export function AddAdminForm({ action }: { action: (username: string, role: "admin" | "moderator" | "owner") => Promise<ActionResult> }) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"admin" | "moderator" | "owner">("moderator");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-surface p-4 ring-1 ring-border">
      <label className="text-[12px] text-muted">
        Username
        <input value={username} onChange={(e) => setUsername(e.target.value)} className={`${input} mt-1 w-48`} placeholder="@username" />
      </label>
      <label className="text-[12px] text-muted">
        Role
        <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={`${input} mt-1`}>
          <option value="moderator">moderator</option>
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </select>
      </label>
      <button type="button" disabled={!username.trim() || pending} onClick={() => start(async () => setResult(await action(username, role)))} className={btn()}>
        Add
      </button>
      <Result r={result} />
    </div>
  );
}

// ── Rivaly Data ──────────────────────────────────────────────────────

type DatasetOption = { id: string; title: string };

function DatasetChecks({ options, value, onChange }: { options: DatasetOption[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {options.map((d) => (
        <label key={d.id} className="flex items-center gap-1.5 text-[12px] text-foreground">
          <input type="checkbox" checked={value.includes(d.id)} onChange={(e) => onChange(e.target.checked ? [...value, d.id] : value.filter((x) => x !== d.id))} />
          {d.title}
        </label>
      ))}
    </div>
  );
}

export function PartnerForm({ options, action }: { options: DatasetOption[]; action: (v: { name: string; contact: string; datasets: string[]; ratePerMin: number }) => Promise<ActionResult> }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [datasets, setDatasets] = useState<string[]>([]);
  const [rate, setRate] = useState("60");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 ring-1 ring-border">
      <div className="grid gap-3 sm:grid-cols-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Partner name" className={input} />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Contact (email or person)" className={input} />
        <label className="flex items-center gap-2 text-[12px] text-muted">
          Requests / min
          <input value={rate} onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))} className={`${input} w-24`} inputMode="numeric" />
        </label>
      </div>
      <DatasetChecks options={options} value={datasets} onChange={setDatasets} />
      <button
        type="button"
        disabled={!name.trim() || pending}
        onClick={() =>
          start(async () => {
            const r = await action({ name, contact, datasets, ratePerMin: Number(rate) });
            setResult(r);
            if (r.ok) {
              setName("");
              setContact("");
              setDatasets([]);
            }
          })
        }
        className={`${btn()} self-start`}
      >
        Add partner
      </button>
      <Result r={result} />
    </div>
  );
}

export function PartnerEdit({
  options,
  initial,
  action,
}: {
  options: DatasetOption[];
  initial: { datasets: string[]; ratePerMin: number; active: boolean };
  action: (v: { datasets: string[]; ratePerMin: number; active: boolean }) => Promise<ActionResult>;
}) {
  const [datasets, setDatasets] = useState(initial.datasets);
  const [rate, setRate] = useState(String(initial.ratePerMin));
  const [active, setActive] = useState(initial.active);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <DatasetChecks options={options} value={datasets} onChange={setDatasets} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[12px] text-muted">
          Requests / min
          <input value={rate} onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))} className={`${input} w-20`} inputMode="numeric" />
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-foreground">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
        <button type="button" disabled={pending} onClick={() => start(async () => setResult(await action({ datasets, ratePerMin: Number(rate), active })))} className={btn()}>
          Save
        </button>
      </div>
      <Result r={result} />
    </div>
  );
}

export function IssueKeyButton({ action }: { action: () => Promise<{ ok: true; key: string; prefix: string } | { ok: false; error: string }> }) {
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  if (key) {
    return (
      <div className="rounded-lg border border-[var(--rival-green)] bg-background p-3">
        <p className="text-[12px] text-rival-green">New key — copy it now. It won&apos;t be shown again (only its hash is stored).</p>
        <code className="mt-2 block break-all font-mono text-[12px] text-foreground">{key}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(key);
            setCopied(true);
          }}
          className={`${btn()} mt-2`}
        >
          {copied ? "Copied" : "Copy key"}
        </button>
      </div>
    );
  }
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action();
            if (r.ok) setKey(r.key);
            else setError(r.error);
          })
        }
        className={btn()}
      >
        {pending ? "Issuing…" : "Issue API key"}
      </button>
      {error && <p className="mt-1 text-[12px] text-rival-red">{error}</p>}
    </div>
  );
}

export function MinGroupForm({ initial, action }: { initial: number; action: (n: number, reason: string) => Promise<ActionResult> }) {
  const [n, setN] = useState(String(initial));
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface p-4 ring-1 ring-border">
      <label className="flex items-center gap-2 text-[12px] text-muted">
        Smallest group a dataset may describe
        <input value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, ""))} className={`${input} w-20`} inputMode="numeric" /> people
      </label>
      <ActionButton label="Save threshold" action={(reason) => action(Number(n), reason)} help="Any row describing fewer people than this is left out of every dataset, export and API response. 3 minimum; 5 or more recommended." />
    </div>
  );
}
