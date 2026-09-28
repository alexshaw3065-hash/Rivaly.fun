#!/usr/bin/env node
// Design-system drift check (docs/plans/design-system-rebuild.md).
//
//   npm run lint:design            report, exit 0
//   npm run lint:design -- --strict   exit 1 if anything is found
//   npm run lint:design -- --files    also list the worst files per rule
//
// It flags the values the system replaces: one-off font sizes, raw hex
// colours, inline/arbitrary shadows, one-off radii, off-grid spacing and
// monospace used as a label voice. Each phase of the rebuild drives these to
// zero; --strict joins CI once they get there.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const strict = process.argv.includes("--strict");
const showFiles = process.argv.includes("--files");

// Rendered as images on the server (next/og): no CSS variables there, so
// literal colours are the only option. The dev-only /kit preview copies
// today's markup on purpose, to compare it with the kit.
const EXEMPT = [/[\\/]app[\\/]kit[\\/]/, /[\\/]card[\\/]route\.tsx$/, /opengraph-image\.tsx$/, /twitter-image\.tsx$/, /icon\.tsx$/, /-card-image\.tsx$/];

const RULES = [
  {
    id: "font-size",
    why: "one-off font size — use the ramp (text-display … text-micro)",
    re: /\btext-\[\d+(?:\.\d+)?(?:px|rem)\]/g,
  },
  {
    id: "raw-hex",
    why: "raw colour — use a token (bg-surface, text-secondary, bg-yes-tint …)",
    re: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/g,
  },
  {
    id: "shadow",
    why: "inline or arbitrary shadow — only shadow-pop / shadow-sheet / shadow-fab",
    re: /\bboxShadow\s*:|\bshadow-\[[^\]]+\]|\bshadow-(?:sm|md|lg|xl|2xl)\b/g,
  },
  {
    id: "radius",
    why: "one-off radius — use rounded-tag / -control / -card / -sheet / -full",
    re: /\brounded(?:-[trblse]{1,2})?-\[[^\]]+\]/g,
  },
  {
    id: "off-grid",
    why: "off the 4px grid (10px, 14px, 18px …) — use 8/12/16/20",
    re: /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(?:[2-9]|1[0-9])\.5\b/g,
  },
  {
    id: "mono-label",
    why: "monospace as a label voice — mono is only for codes, addresses, hashes",
    re: /\bfont-mono\b[^"'`]*\buppercase\b|\buppercase\b[^"'`]*\bfont-mono\b/g,
  },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(entry.name) && !EXEMPT.some((r) => r.test(p))) out.push(p);
  }
  return out;
}

const results = Object.fromEntries(RULES.map((r) => [r.id, { total: 0, files: new Map() }]));
for (const file of walk(SRC)) {
  // Comments describe values; only code counts.
  const code = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const rule of RULES) {
    const n = (code.match(rule.re) ?? []).length;
    if (!n) continue;
    const r = results[rule.id];
    r.total += n;
    r.files.set(path.relative(ROOT, file), n);
  }
}

let grand = 0;
console.log("\nDesign-system drift (docs/plans/design-system-rebuild.md)\n");
for (const rule of RULES) {
  const r = results[rule.id];
  grand += r.total;
  console.log(`  ${rule.id.padEnd(11)} ${String(r.total).padStart(4)}  in ${String(r.files.size).padStart(3)} files   ${rule.why}`);
  if (showFiles && r.files.size) {
    for (const [f, n] of [...r.files].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`${"".padEnd(16)}${String(n).padStart(4)}  ${f}`);
  }
}
console.log(`\n  total       ${String(grand).padStart(4)}\n`);
if (strict && grand > 0) process.exit(1);
