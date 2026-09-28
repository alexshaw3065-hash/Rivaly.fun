import Link from "next/link";
import type { ReactNode } from "react";

// Admin building blocks — server components, dense and quiet. Numbers are
// set in the mono face so columns line up; colour is kept for state
// (good / warning / bad), never decoration.

export const usd = (cents: number | null | undefined, opts: { compact?: boolean } = {}) => {
  const d = Number(cents ?? 0) / 100;
  if (opts.compact && Math.abs(d) >= 1000) return `$${(d / 1000).toFixed(d >= 10_000 ? 0 : 1)}K`;
  return `$${d.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(d) ? 0 : 2, maximumFractionDigits: 2 })}`;
};

export const num = (n: number | null | undefined) => Number(n ?? 0).toLocaleString("en-US");

export function when(iso: string | null | undefined, style: "short" | "full" = "short"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return style === "full"
    ? d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-label text-secondary">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Section({ title, hint, children, actions }: { title: string; hint?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-label font-semibold uppercase text-secondary">{title}</h2>
        {actions ?? (hint && <p className="text-caption text-secondary">{hint}</p>)}
      </div>
      {children}
    </section>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "money";
const TONE: Record<Tone, string> = {
  neutral: "var(--foreground)",
  good: "var(--money)",
  warn: "#f5a524",
  bad: "var(--no)",
  money: "var(--foreground)",
};

export function Kpi({ label, value, sub, tone = "neutral", href }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; href?: string }) {
  const body = (
    <>
      <p className="text-caption text-secondary">{label}</p>
      <p className="mt-1 font-mono text-title-2 font-semibold tabular-nums leading-none" style={{ color: TONE[tone] }}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-caption text-secondary">{sub}</p>}
    </>
  );
  const cls = "block rounded-card bg-surface p-4 edge";
  return href ? (
    <Link href={href} className={`${cls} transition-colors `}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{children}</div>;
}

export interface Column<T> {
  label: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function DataTable<T>({ columns, rows, rowHref, empty = "Nothing here yet." }: { columns: Column<T>[]; rows: T[]; rowHref?: (row: T) => string; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-card bg-surface edge">
      <table className="w-full min-w-[720px] border-collapse text-label">
        <thead>
          <tr className="border-b border-line text-left">
            {columns.map((c) => (
              <th key={c.label} className={`whitespace-nowrap px-3 py-3 text-caption font-semibold uppercase text-secondary ${c.align === "right" ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-secondary">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line last:border-0 hover:bg-foreground/[0.02]">
              {columns.map((c, j) => (
                <td key={c.label} className={`px-3 py-3 align-top ${c.align === "right" ? "text-right font-mono tabular-nums" : ""} ${c.className ?? ""}`}>
                  {j === 0 && rowHref ? (
                    <Link href={rowHref(row)} className="text-foreground hover:underline">
                      {c.cell(row)}
                    </Link>
                  ) : (
                    c.cell(row)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATE_TONE: Record<string, Tone> = {
  open: "neutral",
  live: "good",
  awaiting_result: "warn",
  verifying: "warn",
  settling: "warn",
  settled: "good",
  refunded: "neutral",
  cancelled: "neutral",
  stuck: "bad",
  scheduled: "neutral",
  finished: "neutral",
  postponed: "warn",
  ok: "good",
  pending: "warn",
  failed: "bad",
  confirmed: "good",
  sent: "warn",
  active: "good",
  suspended: "warn",
  banned: "bad",
};

export function StatePill({ state, label }: { state: string; label?: string }) {
  const tone = STATE_TONE[state] ?? "neutral";
  const color = TONE[tone];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-caption font-medium" style={{ color: tone === "neutral" ? "var(--text-secondary)" : color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone === "neutral" ? "var(--line-strong)" : color }} aria-hidden />
      {label ?? state.replaceAll("_", " ")}
    </span>
  );
}

export function Tabs({ tabs, active, base }: { tabs: { id: string; label: string; count?: number }[]; active: string; base: string }) {
  return (
    <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <Link
            key={t.id}
            href={`${base}${base.includes("?") ? "&" : "?"}tab=${t.id}`}
            className="-mb-px shrink-0 border-b-2 px-3 pb-3 text-label font-medium transition-colors"
            style={{ borderColor: on ? "var(--foreground)" : "transparent", color: on ? "var(--foreground)" : "var(--text-secondary)" }}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 font-mono text-caption text-secondary">{t.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

/** A small daily bar chart (server-rendered SVG). */
export function Bars({ data, format = (v) => String(v), height = 96 }: { data: { label: string; value: number }[]; format?: (v: number) => string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / Math.max(1, data.length);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="rounded-card bg-surface p-4 edge">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{format(total)}</p>
        <p className="text-caption text-secondary">
          {data[0]?.label} → {data[data.length - 1]?.label}
        </p>
      </div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="mt-3 block h-24 w-full" role="img" aria-label="Daily chart">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 4);
          return (
            <rect key={i} x={i * w + w * 0.15} y={height - h} width={w * 0.7} height={Math.max(h, d.value > 0 ? 1.5 : 0.5)} rx={0.6} fill={d.value > 0 ? "var(--yes)" : "var(--line)"}>
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface p-4 edge">
      {steps.map((s, i) => {
        const pct = Math.round((s.value / top) * 100);
        const fromPrev = i > 0 && steps[i - 1].value > 0 ? Math.round((s.value / steps[i - 1].value) * 100) : null;
        return (
          <div key={s.label}>
            <div className="flex items-baseline justify-between text-label">
              <span className="text-foreground">{s.label}</span>
              <span className="font-mono tabular-nums text-secondary">
                <span className="text-foreground">{num(s.value)}</span> · {pct}%{fromPrev !== null && <> · {fromPrev}% of previous</>}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--yes)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-card bg-surface px-4 py-10 text-center text-label text-secondary edge">{children}</p>;
}

export function Mono({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className="font-mono text-caption text-secondary" title={title}>
      {children}
    </span>
  );
}

export const shortId = (id: string | null | undefined) => (id ? `${id.slice(0, 8)}` : "—");
