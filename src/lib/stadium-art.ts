// The room's stadium as a still SVG string, for server-rendered images (the
// position share card). Same crowd as the room (buildCrowd: fans in the two
// clubs' colours, YES end on the left, NO on the right), at night, with one
// end on its feet: arms up, scarves out, and its upper tier holding up the
// card mosaic that spells its side — the room's "takeover", frozen.
// Night colours are the dark theme's --st-* values (globals.css): an image
// has no CSS variables, and no color-mix, so the seat tint is mixed here.

import { buildCrowd, type CrowdLayer, type End } from "@/components/room/crowd";
import { teamIdentity } from "./team-identity";

const W = 400;
const AWAY_FROM = 300;
const END_SPLIT = 200;
const ROOF_BOTTOM = 27;
const UPPER = { top: 30, rows: 4, rowH: 14, head: 3.7, gap: 10.5 };
const LOWER = { top: 96, rows: 3, rowH: 17, head: 4.9, gap: 13.5 };
const BOARDS_Y = 147;
const PITCH_Y = BOARDS_Y + 11;
const NIGHT = { sky1: "#03050a", sky2: "#0b1322", roof: "#0c1017", stand: "#151a22", glass: "#ffd98a", light: "#fff4d6", board: "#070a10", pitch1: "#0d3a20", pitch2: "#16602f" };
const SIDE: Record<End, string> = { yes: "#3d6bff", no: "#ef4444" };

const GLYPHS: Record<string, string[]> = {
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
};

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => {
    const v = Number.parseInt(h.replace("#", "").slice(0, 6), 16) || 0;
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((c, i) => Math.round(c * t + y[i] * (1 - t))).join(",")})`;
}

function tifo(side: End): string {
  const cell = 3.5;
  const x0 = side === "yes" ? 6 : END_SPLIT + 6;
  const cols = Math.floor((END_SPLIT - 12) / cell);
  const rows = Math.floor((UPPER.rows * UPPER.rowH - 2) / cell);
  const word = side === "yes" ? "YES" : "NO";
  const scale = 2;
  const startCol = Math.floor((cols - (word.length * 6 - 1) * scale) / 2);
  const startRow = Math.floor((rows - 7 * scale) / 2);
  const lit = new Set<string>();
  [...word].forEach((ch, li) =>
    GLYPHS[ch].forEach((line, gy) =>
      [...line].forEach((bit, gx) => {
        if (bit !== "1") return;
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) lit.add(`${startCol + (li * 6 + gx) * scale + dx},${startRow + gy * scale + dy}`);
      }),
    ),
  );
  let base = "";
  let shade = "";
  let letters = "";
  const size = cell - 0.6;
  const card = (c: number, r: number) => `M${(x0 + c * cell).toFixed(1)} ${(UPPER.top + 1 + r * cell).toFixed(1)}h${size}v${size}h${-size}Z`;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (lit.has(`${c},${r}`)) letters += card(c, r);
      else if ((c + r) % 3 === 0) shade += card(c, r);
      else base += card(c, r);
    }
  return `<path d="${base}" fill="${SIDE[side]}"/><path d="${shade}" fill="${SIDE[side]}" opacity="0.78"/><path d="${letters}" fill="#fff"/>`;
}

function crowdGroup(layer: CrowdLayer, end: End, level: number): string {
  const fill = (m: Map<string, string>) => [...m].map(([c, d]) => `<path d="${d}" fill="${c}"/>`).join("");
  const stroke = (m: Map<string, string>) =>
    [...m]
      .map(([key, d]) => {
        const [c, w] = key.split("|");
        return `<path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
      })
      .join("");
  const flashes = [...layer.flashes, ...(level > 0.5 ? layer.hypeFlashes : [])].filter((_, i) => i % 2 === 0);
  return (
    fill(layer.bodies) +
    `<path d="${layer.allBodies}" fill="${SIDE[end]}" opacity="${(level * 0.28).toFixed(2)}"/>` +
    fill(layer.skin) +
    fill(layer.hair) +
    stroke(layer.arms) +
    fill(layer.hands) +
    (level > 0.5 ? stroke(layer.hypeArms) + fill(layer.hypeHands) + fill(layer.scarves) : "") +
    flashes.map((f) => `<circle cx="${f.x}" cy="${f.y}" r="1.3" fill="#fff" opacity="0.9"/>`).join("")
  );
}

/**
 * The stands at night, `height` units tall (of a 400-wide picture), with
 * `loud` on its feet and holding up its mosaic.
 */
export function stadiumSvg(homeTeam: string, awayTeam: string, loud: End, height = 230): string {
  const home = teamIdentity(homeTeam);
  const away = teamIdentity(awayTeam);
  const crowd = buildCrowd(homeTeam, awayTeam, { width: W, awayFrom: AWAY_FROM, endSplit: END_SPLIT, upper: UPPER, lower: LOWER });
  const level = (end: End) => (end === loud ? 1 : 0.25);
  const upperBottom = UPPER.top + UPPER.rows * UPPER.rowH;
  const lowerBottom = LOWER.top + LOWER.rows * LOWER.rowH;
  const seat = (kit: string) => mix(kit, NIGHT.stand, 0.38);

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" width="${W * 3}" height="${height * 3}">`;
  s += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NIGHT.sky1}"/><stop offset="1" stop-color="${NIGHT.sky2}"/></linearGradient>`;
  s += `<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NIGHT.light}" stop-opacity="0.18"/><stop offset="1" stop-color="${NIGHT.light}" stop-opacity="0"/></linearGradient>`;
  s += `<linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NIGHT.pitch1}"/><stop offset="1" stop-color="${NIGHT.pitch2}"/></linearGradient>`;
  s += `<linearGradient id="glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SIDE[loud]}" stop-opacity="0.22"/><stop offset="1" stop-color="${SIDE[loud]}" stop-opacity="0"/></linearGradient>`;
  s += `<clipPath id="stands"><rect x="0" y="${UPPER.top}" width="${W}" height="${BOARDS_Y - UPPER.top}"/></clipPath></defs>`;
  s += `<rect width="${W}" height="${height}" fill="url(#sky)"/>`;
  // roof and floodlights
  s += `<path d="M0 0H${W}V20L${W - 20} ${ROOF_BOTTOM}H20L0 20Z" fill="${NIGHT.roof}"/>`;
  for (let i = 0; i < 22; i++) s += `<rect x="${24 + i * 16.4}" y="${ROOF_BOTTOM - 4.5}" width="9" height="3" rx="0.8" fill="${NIGHT.light}"/>`;
  // seat rows in the clubs' colours
  for (const tier of [UPPER, LOWER])
    for (let i = 0; i < tier.rows; i++) {
      const y = tier.top + i * tier.rowH;
      const o = i % 2 ? 0.9 : 1;
      s += `<rect x="0" y="${y}" width="${AWAY_FROM}" height="${tier.rowH}" fill="${seat(home.primary)}" opacity="${o}"/><rect x="${AWAY_FROM}" y="${y}" width="${W - AWAY_FROM}" height="${tier.rowH}" fill="${seat(away.primary)}" opacity="${o}"/>`;
    }
  // boxes between the tiers
  s += `<rect x="0" y="${upperBottom}" width="${W}" height="${LOWER.top - upperBottom}" fill="${NIGHT.roof}"/>`;
  for (let i = 0; i < 20; i++) s += `<rect x="${6 + i * 19.6}" y="${upperBottom + 1.5}" width="15" height="${LOWER.top - upperBottom - 3}" rx="0.8" fill="${NIGHT.glass}" opacity="${(0.55 + ((i * 37) % 10) / 30).toFixed(2)}"/>`;
  // the crowd: back tier, depth, the mosaic, front tier
  s += `<g clip-path="url(#stands)">`;
  for (const end of ["yes", "no"] as const) s += crowdGroup(crowd.upper[end], end, level(end));
  s += `<rect x="0" y="${UPPER.top}" width="${W}" height="${UPPER.rows * UPPER.rowH}" fill="#000" opacity="0.22"/>`;
  s += tifo(loud);
  for (const end of ["yes", "no"] as const) s += crowdGroup(crowd.lower[end], end, level(end));
  s += `</g>`;
  // the loud end catches light
  s += `<rect x="${loud === "yes" ? 0 : END_SPLIT}" y="${UPPER.top}" width="${END_SPLIT}" height="${BOARDS_Y - UPPER.top}" fill="url(#glow)"/>`;
  // netting, haze, boards, pitch
  s += `<path d="M${AWAY_FROM} ${UPPER.top}V${lowerBottom}" stroke="${NIGHT.roof}" stroke-width="3"/>`;
  s += `<rect x="0" y="${ROOF_BOTTOM}" width="${W}" height="100" fill="url(#haze)"/>`;
  s += `<rect x="0" y="${BOARDS_Y}" width="${W}" height="11" fill="${NIGHT.board}"/>`;
  for (let i = 0; i < 5; i++) s += `<rect x="${i * 80 + 2}" y="${BOARDS_Y + 2}" width="30" height="7" rx="1" fill="${i % 2 ? away.primary : home.primary}"/><rect x="${i * 80 + 40}" y="${BOARDS_Y + 3.5}" width="32" height="4" rx="1" fill="#ffffff" opacity="0.85"/>`;
  s += `<path d="M0 ${PITCH_Y}H${W}V${height}H0Z" fill="url(#pitch)"/>`;
  for (let i = 0; i < 9; i += 2) s += `<path d="M${(W / 9) * i} ${PITCH_Y}h${W / 9}L${-120 + ((W + 240) / 9) * (i + 1)} ${height}H${-120 + ((W + 240) / 9) * i}Z" fill="#fff" fill-opacity="0.045"/>`;
  s += `<path d="M-10 ${PITCH_Y + 8}H${W + 10}" stroke="#fff" stroke-opacity="0.5" stroke-width="1.1"/>`;
  s += `</svg>`;
  return s;
}
