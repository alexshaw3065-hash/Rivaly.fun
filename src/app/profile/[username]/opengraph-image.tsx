import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { getPlayerCard } from "@/lib/supabase/player-card";
import { cardFonts } from "@/lib/og-fonts";

// What a shared profile link unfurls as (WhatsApp, X, iMessage): their Rivaly
// card beside their name, record and form — "think you can beat them?".
// Satori: flexbox only, every multi-child box says display:flex.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A Rivaly card";

const BG = "#0b0e0d";
const INK = "#f4f6f5";
const MUTED = "#8b938f";

function money(cents: number): string {
  if (cents === 0) return "$0";
  const d = Math.abs(cents) / 100;
  const v = d >= 1000 ? `${(d / 1000).toFixed(1).replace(/\.0$/, "")}K` : `${Math.round(d)}`;
  return `${cents > 0 ? "+" : "−"}$${v}`;
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const card = await getPlayerCard(username);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  let cardSrc: string | null = null;
  if (card) {
    try {
      const res = await fetch(`${origin}/profile/${encodeURIComponent(username)}/card`);
      if (res.ok) cardSrc = `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    } catch {
      cardSrc = null;
    }
  }
  const name = card?.name ?? "Rivaly";
  const form = card?.form ?? [];

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", alignItems: "center", background: BG, color: INK, fontFamily: "Geist, sans-serif", padding: "0 80px", gap: 64 }}>
        {cardSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cardSrc} width={396} height={560} alt="" style={{ width: 396, height: 560 }} />
        ) : (
          <div style={{ display: "flex", width: 396, height: 560 }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 10, color: MUTED }}>RIVALY</div>
          <div style={{ display: "flex", marginTop: 26, fontSize: name.length > 12 ? 60 : 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05 }}>{name.length > 24 ? `${name.slice(0, 23)}…` : name}</div>
          {card && <div style={{ display: "flex", marginTop: 8, fontSize: 32, color: MUTED }}>@{card.username}</div>}
          {card && (
            <div style={{ display: "flex", marginTop: 40, fontSize: 36, fontWeight: 800 }}>
              {card.played === 0 ? "No settled rooms yet" : `${card.wins}–${card.losses}  ·  ${money(card.profit)}${card.streak > 1 ? `  ·  ${card.streak} in a row` : ""}`}
            </div>
          )}
          {card && card.played > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              {form.map((r, i) => (
                <div
                  key={i}
                  style={{ display: "flex", width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff", background: r === "W" ? "#1a9a57" : "#d64040" }}
                >
                  {r}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 44, fontSize: 30, color: MUTED }}>Think you can beat them?</div>
        </div>
      </div>
    ),
    { ...size, fonts: await cardFonts() },
  );
}
