import { createHash, randomBytes } from "node:crypto";

// CSV and API-key helpers for Rivaly Data — pure, tested (format.test.ts).

/** RFC 4180 CSV: quotes where needed, doubles inner quotes, fixed column order. */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    // Neutralise spreadsheet formula injection (a cell starting = + - @).
    const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** A new partner API key. Only the hash is stored; the key is shown once. */
export function newApiKey(): { key: string; prefix: string; hash: string } {
  const bytes = randomBytes(32);
  let body = "";
  for (const b of bytes) body += KEY_ALPHABET[b % KEY_ALPHABET.length];
  const key = `rvl_live_${body}`;
  return { key, prefix: key.slice(0, 13), hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function bearer(header: string | null): string | null {
  const m = header?.match(/^Bearer\s+(rvl_live_[A-Za-z0-9]{20,64})$/);
  return m ? m[1] : null;
}
