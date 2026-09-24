import { teamIdentity } from "@/lib/team-identity";

// Builds the stadium's crowd as people, not dots: shoulders in a shirt, a
// neck, a head, hair or a beanie, and — for the ones on their feet — arms
// with sleeves and hands, some holding a scarf up in their team's colours.
// Every fan is grouped by colour into shared path strings, so ~250 detailed
// people still draw as a few dozen SVG paths.
//
// Layers are split by room end (YES left, NO right) and by tier, so the
// stadium can light up one end's fans and put the upper tier slightly back
// in the haze. The "hype" layers (extra arms, scarves, flashes) are what an
// end's energy turns up.

export type End = "yes" | "no";

export interface Tier {
  top: number;
  rows: number;
  rowH: number;
  head: number;
  gap: number;
}

export interface Flash {
  x: number;
  y: number;
  delay: number;
  dur: number;
  awayTeam: boolean;
}

export interface CrowdLayer {
  bodies: Map<string, string>; // per shirt colour
  allBodies: string; // every body, for the side-colour glow
  skin: Map<string, string>; // necks + heads + hands, per skin tone
  hair: Map<string, string>; // hair and beanies, per colour
  arms: Map<string, string>; // raised sleeves (always up), per shirt colour — stroked
  hands: Map<string, string>; // hands on raised arms, per skin tone
  hypeArms: Map<string, string>; // sleeves that go up as the end gets loud
  hypeHands: Map<string, string>;
  scarves: Map<string, string>; // scarves held up when loud, per colour
  flashes: Flash[];
  hypeFlashes: Flash[];
}

export type Crowd = Record<"upper" | "lower", Record<End, CrowdLayer>>;

const SKIN = ["#f1c7a5", "#e0b08c", "#c38e66", "#9a6440", "#6b4128", "#4a2d1c"];
const HAIR = ["#1a1411", "#1a1411", "#3b2a1e", "#5a3d26", "#a67c45", "#8f8f8f"];

const r1 = (n: number) => Math.round(n * 10) / 10;

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function emptyLayer(): CrowdLayer {
  return {
    bodies: new Map(),
    allBodies: "",
    skin: new Map(),
    hair: new Map(),
    arms: new Map(),
    hands: new Map(),
    hypeArms: new Map(),
    hypeHands: new Map(),
    scarves: new Map(),
    flashes: [],
    hypeFlashes: [],
  };
}

const add = (m: Map<string, string>, k: string, d: string) => m.set(k, (m.get(k) ?? "") + d);

/** An ellipse as a path (two arcs), so many can share one <path>. */
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${r1(cx - rx)} ${r1(cy)}a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0`;

export function buildCrowd(
  homeTeam: string,
  awayTeam: string,
  opts: { width: number; awayFrom: number; endSplit: number; upper: Tier; lower: Tier },
): Crowd {
  const { width, awayFrom, endSplit } = opts;
  const rand = seeded(hash(`${homeTeam}|${awayTeam}`));
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const home = teamIdentity(homeTeam);
  const away = teamIdentity(awayTeam);
  const homeShirts = [home.primary, home.primary, home.primary, home.primary, home.secondary, home.secondary, "#f2f2f2", "#1c1c1c", "#2b3445"];
  const awayShirts = [away.primary, away.primary, away.primary, away.secondary, "#f2f2f2", "#1c1c1c"];

  const crowd: Crowd = {
    upper: { yes: emptyLayer(), no: emptyLayer() },
    lower: { yes: emptyLayer(), no: emptyLayer() },
  };

  for (const [tierKey, tier] of [
    ["upper", opts.upper],
    ["lower", opts.lower],
  ] as const) {
    for (let row = 0; row < tier.rows; row++) {
      const rowTop = tier.top + row * tier.rowH;
      const offset = row % 2 ? tier.gap / 2 : 0;
      for (let x = 4 + offset; x < width - 3; x += tier.gap) {
        if (Math.abs(x - awayFrom) < tier.gap * 0.7) continue; // the netting gap
        if (rand() < 0.06) continue; // the odd empty seat
        const awayEnd = x >= awayFrom;
        const layer = crowd[tierKey][x < endSplit ? "yes" : "no"];
        const kit = awayEnd ? away : home;
        const r = tier.head * (0.88 + rand() * 0.24); // head radius
        const cx = x + (rand() - 0.5) * tier.gap * 0.25;
        const standing = rand() < 0.35; // some are up, a head taller
        const cy = rowTop + r + 1 - (standing ? r * 0.5 : 0) + (rand() - 0.5) * 0.8;
        const shirt = pick(awayEnd ? awayShirts : homeShirts);
        const skin = pick(SKIN);
        const w = r * 1.85; // half shoulder width
        const shoulderY = cy + r * 1.5;
        const bottom = rowTop + tier.rowH + r * 0.5;

        // Shoulders and torso
        const body =
          `M${r1(cx - w)} ${r1(bottom)}` +
          `L${r1(cx - w)} ${r1(shoulderY + r * 0.5)}` +
          `Q${r1(cx - w)} ${r1(shoulderY - r * 0.15)} ${r1(cx - w * 0.45)} ${r1(shoulderY - r * 0.3)}` +
          `L${r1(cx + w * 0.45)} ${r1(shoulderY - r * 0.3)}` +
          `Q${r1(cx + w)} ${r1(shoulderY - r * 0.15)} ${r1(cx + w)} ${r1(shoulderY + r * 0.5)}` +
          `L${r1(cx + w)} ${r1(bottom)}Z`;
        add(layer.bodies, shirt, body);
        layer.allBodies += body;

        // Neck + head
        add(layer.skin, skin, `M${r1(cx - r * 0.38)} ${r1(cy + r * 0.6)}h${r1(r * 0.76)}v${r1(r * 0.75)}h${r1(-r * 0.76)}Z`);
        add(layer.skin, skin, ellipse(cx, cy, r * 0.9, r));

        // Hair, or a beanie in the team's colours
        const hat = rand();
        if (hat < 0.14) {
          add(layer.hair, kit.primary, `M${r1(cx - r * 0.98)} ${r1(cy - r * 0.05)}A${r1(r * 0.98)} ${r1(r * 1.05)} 0 0 1 ${r1(cx + r * 0.98)} ${r1(cy - r * 0.05)}Z`);
          add(layer.hair, kit.secondary, ellipse(cx, cy - r * 1.05, r * 0.3, r * 0.28));
        } else if (hat < 0.92) {
          add(
            layer.hair,
            pick(HAIR),
            `M${r1(cx - r * 0.93)} ${r1(cy - r * 0.05)}A${r1(r * 0.93)} ${r1(r)} 0 0 1 ${r1(cx + r * 0.93)} ${r1(cy - r * 0.05)}Q${r1(cx)} ${r1(cy - r * 0.55)} ${r1(cx - r * 0.93)} ${r1(cy - r * 0.05)}Z`,
          );
        } // else: shaved head

        // Arms up: a few always, many more when the end gets loud
        const lift = rand();
        if (lift < 0.5) {
          const hype = lift >= 0.08;
          const armW = r1(r * 0.62);
          const reach = r * (2.2 + rand() * 0.6);
          const lx = cx - w * 1.05;
          const rx = cx + w * 1.05;
          const handY = cy - reach;
          const sleeves =
            `M${r1(cx - w * 0.78)} ${r1(shoulderY)}L${r1(lx)} ${r1(handY)}` + `M${r1(cx + w * 0.78)} ${r1(shoulderY)}L${r1(rx)} ${r1(handY)}`;
          const hands = ellipse(lx, handY - r * 0.1, r * 0.34, r * 0.36) + ellipse(rx, handY - r * 0.1, r * 0.34, r * 0.36);
          add(hype ? layer.hypeArms : layer.arms, `${shirt}|${armW}`, sleeves);
          add(hype ? layer.hypeHands : layer.hands, skin, hands);
          // Some hold a scarf up between their hands — only when it's loud
          if (hype && rand() < 0.45) {
            const sy = handY - r * 0.35;
            const sh = r * 0.7;
            add(layer.scarves, kit.primary, `M${r1(lx - r * 0.2)} ${r1(sy)}h${r1(rx - lx + r * 0.4)}v${r1(sh)}h${r1(-(rx - lx + r * 0.4))}Z`);
            add(layer.scarves, kit.secondary, `M${r1(lx - r * 0.2)} ${r1(sy + sh * 0.38)}h${r1(rx - lx + r * 0.4)}v${r1(sh * 0.24)}h${r1(-(rx - lx + r * 0.4))}Z`);
          }
        }

        // Phone flashes
        const flash = { x: r1(cx + (rand() - 0.5) * r), y: r1(cy - r * 0.2), delay: r1(rand() * 6), dur: r1(2.5 + rand() * 4), awayTeam: awayEnd };
        const f = rand();
        if (f < 0.03) layer.flashes.push(flash);
        else if (f < 0.1) layer.hypeFlashes.push({ ...flash, dur: r1(1.2 + rand() * 1.6) });
      }
    }
  }
  return crowd;
}
