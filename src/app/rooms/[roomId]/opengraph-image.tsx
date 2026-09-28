import { ImageResponse } from "next/og";
import { getRoomById } from "@/lib/supabase/rooms";
import { getMatchById } from "@/lib/supabase/matches";
import { cardFonts } from "@/lib/og-fonts";

// What a shared room unfurls as (WhatsApp, X, iMessage) — the thing that makes
// someone tap: the call, the fixture, and how the two sides stand right now,
// from the room's real totals. A private room shows nothing about itself (link
// previews are fetched signed out, so it isn't readable here anyway).
// Satori: flexbox only, every multi-child box says display:flex.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A prediction room on Rivaly";

const BG = "#0a0a0a";
const INK = "#f5f5f5";
const MUTED = "#a3a3a3";
const YES = "#3d6bff";
const NO = "#ef4444";
const MONEY = "#1fae63";

const usd = (cents: number) => {
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (d >= 10_000) return `$${(d / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${d.toLocaleString("en-US", { maximumFractionDigits: d % 1 ? 2 : 0, minimumFractionDigits: d % 1 ? 2 : 0 })}`;
};

export default async function Image({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const room = await getRoomById(roomId);
  const match = room ? await getMatchById(room.matchId) : undefined;
  const fonts = await cardFonts();

  if (!room || !match || room.visibility !== "public") {
    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", justifyContent: "center", background: BG, color: INK, fontFamily: "Geist, sans-serif", padding: "0 80px" }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 10, color: MUTED }}>RIVALY</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 76, fontWeight: 800, letterSpacing: -2 }}>A room on Rivaly</div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 32, color: MUTED }}>Open it to see the call and pick a side.</div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  const yes = room.yesTotalCents ?? 0;
  const no = room.noTotalCents ?? 0;
  const total = yes + no;
  const settled = room.status === "settled" || room.status === "refunded";
  const outcome = room.resolvedOutcome;
  // Calls run from "Over 3.5 goals" to "Seattle Sounders v Real Salt Lake ends
  // in a draw": the size steps down so the whole call fits in three lines.
  const call = room.prediction.length > 90 ? `${room.prediction.slice(0, 89)}…` : room.prediction;
  const callSize = call.length <= 22 ? 92 : call.length <= 40 ? 76 : call.length <= 64 ? 62 : 52;
  const kickoff = new Date(match.kickoffAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const footer = settled
    ? outcome === "void" || room.status === "refunded" || yes === 0 || no === 0
      ? "Every stake went back"
      : outcome === "yes"
        ? "Called it. Winners paid."
        : "The call missed. Winners paid."
    : total === 0
      ? "Nobody's taken the other side yet"
      : "Back it or take the other side";

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: BG, color: INK, fontFamily: "Geist, sans-serif", padding: "64px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: MUTED }}>
          <div style={{ display: "flex", fontWeight: 800, letterSpacing: 10 }}>RIVALY</div>
          <div style={{ display: "flex" }}>
            {match.competition} · {kickoff}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: callSize >= 76 ? 64 : 44 }}>
          <div style={{ display: "flex", fontSize: callSize, fontWeight: 800, letterSpacing: callSize >= 76 ? -3 : -2, lineHeight: 1.04 }}>{call}?</div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 36, color: MUTED }}>
            {match.homeTeam} vs {match.awayTeam}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 800 }}>
            <div style={{ display: "flex", color: YES }}>YES {total > 0 ? usd(yes) : ""}</div>
            <div style={{ display: "flex", color: NO }}>{total > 0 ? usd(no) : ""} NO</div>
          </div>
          <div style={{ display: "flex", height: 14, marginTop: 16, borderRadius: 7, overflow: "hidden", background: "#262626" }}>
            {total > 0 && <div style={{ display: "flex", flex: Math.max(yes, 1), background: YES }} />}
            {total > 0 && <div style={{ display: "flex", width: 8, background: BG }} />}
            {total > 0 && <div style={{ display: "flex", flex: Math.max(no, 1), background: NO }} />}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, fontSize: 30 }}>
            <div style={{ display: "flex", color: INK }}>{footer}</div>
            {total > 0 && (
              <div style={{ display: "flex", color: MONEY, fontWeight: 800 }}>
                {usd(total)} pool · {room.participantCount} {room.participantCount === 1 ? "rival" : "rivals"}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
