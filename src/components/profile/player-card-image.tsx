// The Rivaly card — a football player card, drawn for next/og (Satori) so it
// arrives as ONE image: artwork, avatar, numbers and form together, never
// text first and the card after. Flexbox only; every multi-child box says
// display:flex. Numbers are sized to always sit inside the shield.

import { cloudinaryAvatarUrl } from "@/lib/cloudinary";

// Laid out at 840×1188 and drawn at 3/4 size (630×891): sharp on phones,
// a fraction of the bytes.
const BASE_W = 840;
const BASE_H = 1188;
const SCALE = 0.75;
export const CARD_W = BASE_W * SCALE;
export const CARD_H = BASE_H * SCALE;

export type Tier = "gold" | "silver" | "bronze";

export interface PlayerCardData {
  name: string;
  username: string;
  avatarUrl: string | null;
  rating: number | null;
  tier: Tier | null;
  played: number;
  wins: number;
  losses: number;
  profit: number;
  streak: number;
  form: ("W" | "L")[];
  attrs: { acc: number; frm: number; str: number; exp: number; win: number; fan: number };
}

const INK: Record<Tier, string> = { gold: "#241a06", silver: "#16181c", bronze: "#2a1306" };
const SOFT: Record<Tier, string> = { gold: "rgba(36,26,6,0.55)", silver: "rgba(22,24,28,0.55)", bronze: "rgba(42,19,6,0.6)" };
const LINE: Record<Tier, string> = { gold: "rgba(36,26,6,0.22)", silver: "rgba(22,24,28,0.2)", bronze: "rgba(42,19,6,0.25)" };

/** Long names shrink so they never run off the card. */
function nameSize(name: string): number {
  const n = name.length;
  return n <= 10 ? 64 : n <= 14 ? 54 : n <= 18 ? 44 : 36;
}

/** `character` is the drawn rival as an SVG data URL (used when there's no photo). */
export function playerCard(d: PlayerCardData, art: string, character: string) {
  // Unrated players get the bronze art but read "NR" — no fake rating.
  const tier: Tier = d.tier ?? "bronze";
  const ink = INK[tier];
  const soft = SOFT[tier];
  const line = LINE[tier];
  const name = d.name.length > 22 ? `${d.name.slice(0, 21)}…` : d.name;
  const attrs: [string, number][] = [
    ["ACC", d.attrs.acc],
    ["FRM", d.attrs.frm],
    ["STR", d.attrs.str],
    ["EXP", d.attrs.exp],
    ["WIN", d.attrs.win],
    ["FAN", d.attrs.fan],
  ];
  const noResults = d.played === 0;

  return (
    <div style={{ width: CARD_W, height: CARD_H, display: "flex", position: "relative", overflow: "hidden" }}>
    <div style={{ width: BASE_W, height: BASE_H, display: "flex", position: "absolute", left: 0, top: 0, transform: `scale(${SCALE})`, transformOrigin: "top left", fontFamily: "Geist, sans-serif", color: ink }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art} width={BASE_W} height={BASE_H} alt="" style={{ position: "absolute", left: 0, top: 0, width: BASE_W, height: BASE_H }} />

      {/* Rating column, top left */}
      <div style={{ position: "absolute", left: 96, top: 118, display: "flex", flexDirection: "column", alignItems: "center", width: 170 }}>
        <div style={{ display: "flex", fontSize: d.rating === null ? 96 : 132, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>{d.rating === null ? "NR" : String(d.rating)}</div>
        <div style={{ display: "flex", marginTop: 10, fontSize: 28, fontWeight: 800, letterSpacing: 6 }}>{d.tier ? d.tier.toUpperCase() : "UNRATED"}</div>
        <div style={{ display: "flex", width: 90, height: 3, background: line, marginTop: 18, marginBottom: 16 }} />
        <div style={{ display: "flex", fontSize: 22, fontWeight: 800, letterSpacing: 7, color: soft }}>RIVALY</div>
      </div>

      {/* Name */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 548, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: nameSize(name), fontWeight: 800, letterSpacing: -1, lineHeight: 1.05 }}>{name}</div>
        <div style={{ display: "flex", marginTop: 6, fontSize: 26, fontWeight: 500, color: soft }}>@{d.username}</div>
        <div style={{ display: "flex", width: 560, height: 3, background: line, marginTop: 22 }} />
      </div>

      {/* Six attributes, two columns */}
      <div style={{ position: "absolute", left: 150, right: 150, top: 690, display: "flex", justifyContent: "space-between" }}>
        {[attrs.slice(0, 3), attrs.slice(3)].map((col, c) => (
          <div key={c} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {col.map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "baseline", width: 220 }}>
                <div style={{ display: "flex", width: 92, fontSize: 50, fontWeight: 800, letterSpacing: -1 }}>{noResults && k !== "FAN" ? "–" : String(v)}</div>
                <div style={{ display: "flex", fontSize: 34, fontWeight: 500, color: soft }}>{k}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Form: last five, newest first */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 952, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12 }}>
          {Array.from({ length: 5 }, (_, i) => d.form[i] ?? null).map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: 58,
                height: 58,
                borderRadius: 29,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 800,
                color: r ? "#ffffff" : soft,
                background: r === "W" ? "#1a9a57" : r === "L" ? "#d64040" : "transparent",
                border: r ? "none" : `3px dashed ${line}`,
              }}
            >
              {r ?? ""}
            </div>
          ))}
        </div>
        {/* The form dots speak for themselves; only a brand-new card says why they're empty. */}
        {noResults && <div style={{ display: "flex", marginTop: 14, fontSize: 24, fontWeight: 800, letterSpacing: 5, color: soft }}>NO SETTLED ROOMS YET</div>}
      </div>
    </div>
      {/* Avatar, top right — drawn outside the scaled layer so it stays whole and sharp */}
      <div style={{ position: "absolute", right: 104 * SCALE, top: 128 * SCALE, width: 380 * SCALE, height: 380 * SCALE, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {d.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cloudinaryAvatarUrl(d.avatarUrl, 380)} width={340 * SCALE} height={340 * SCALE} alt="" style={{ width: 340 * SCALE, height: 340 * SCALE, borderRadius: 170 * SCALE, objectFit: "cover", border: `${6 * SCALE}px solid ${line}` }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={character} width={360 * SCALE} height={360 * SCALE} alt="" style={{ width: 360 * SCALE, height: 360 * SCALE }} />
        )}
      </div>
    </div>
  );
}
