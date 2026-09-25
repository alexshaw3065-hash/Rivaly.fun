import { ImageResponse } from "next/og";
import { getRoomById } from "@/lib/supabase/rooms";
import { getMatchById } from "@/lib/supabase/matches";
import { getMatchEventRows } from "@/lib/supabase/match-events";
import { momentum } from "@/lib/match-stats";
import { matchStory } from "@/lib/match-pressure";
import { teamFills } from "@/lib/team-fills";
import { abbreviateClaim, competitionShort } from "@/lib/team-identity";

// The match story as a card to share after the whistle: the score in the
// teams' colours, the room's call and who called it, the one-line story, and
// the momentum curve with the goals on it. Portrait, sized for stories and
// chats. "Screenshots → people share → new users" is the growth loop in the
// masterplan (05-growth.md); this is the screenshot, made properly.
//
// Rendered by next/og (Satori): flexbox only, every multi-child box says
// display:flex, and the chart goes in as an SVG image.

const W = 1080;
const H = 1350;
const BG = "#0b0e0d";
const INK = "#f4f6f5";
const MUTED = "#8b938f";
const BLUE = "#4f7cff";
const RED = "#ef4444";

export async function GET(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const room = await getRoomById(roomId);
  if (!room) return new Response("Not found", { status: 404 });
  const match = await getMatchById(room.matchId);
  if (!match) return new Response("Not found", { status: 404 });

  const rows = await getMatchEventRows(match.id);
  const flow = momentum(rows);
  const story = matchStory(rows, {
    home: match.homeTeam,
    away: match.awayTeam,
    homeScore: match.homeScore ?? null,
    awayScore: match.awayScore ?? null,
    finished: match.status === "finished",
  });
  const { home, away, codes } = teamFills(match);
  const claim = abbreviateClaim(room.prediction, match.homeTeam, match.awayTeam);
  const outcome = room.resolvedOutcome ?? null;
  const chart = `data:image/svg+xml;base64,${Buffer.from(chartSvg(flow, home.fill, away.fill)).toString("base64")}`;
  const share = story?.share ?? { home: 0, away: 0 };

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: BG, color: INK, padding: "0 72px 72px", fontFamily: "sans-serif" }}>
        {/* The two sides, edge to edge */}
        <div style={{ display: "flex", margin: "0 -72px", height: 14 }}>
          <div style={{ display: "flex", flex: 1, background: home.fill }} />
          <div style={{ display: "flex", flex: 1, background: away.fill }} />
        </div>
        {/* Top line */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, color: MUTED, letterSpacing: 4, marginTop: 58 }}>
          <div style={{ display: "flex", color: INK, fontWeight: 800, letterSpacing: 10 }}>RIVALY</div>
          <div style={{ display: "flex" }}>
            {competitionShort(match.competition)} · {match.status === "finished" ? "FULL TIME" : match.status === "live" ? "LIVE" : "PREVIEW"}
          </div>
        </div>

        {/* Score */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 64, padding: "40px 24px", borderRadius: 36, background: `linear-gradient(90deg, ${tint(home.fill)} 0%, ${tint(home.fill)} 50%, ${tint(away.fill)} 50%, ${tint(away.fill)} 100%)` }}>
          <Team code={codes.home} name={match.homeTeam} fill={home.fill} ink={home.ink} />
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -4 }}>
            {match.homeScore ?? 0}
            <span style={{ color: MUTED, margin: "0 28px", fontWeight: 400 }}>–</span>
            {match.awayScore ?? 0}
          </div>
          <Team code={codes.away} name={match.awayTeam} fill={away.fill} ink={away.ink} />
        </div>

        {/* The call */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 64 }}>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 700, textAlign: "center" }}>{claim}</div>
          {outcome && outcome !== "void" && (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                padding: "10px 26px",
                borderRadius: 999,
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: 2,
                background: outcome === "yes" ? BLUE : RED,
                color: "#fff",
              }}
            >
              {outcome === "yes" ? "YES" : "NO"} CALLED IT
            </div>
          )}
        </div>

        {/* Story */}
        {story && (
          <div style={{ display: "flex", marginTop: 72, paddingLeft: 28, borderLeft: `8px solid ${share.home >= share.away ? home.fill : away.fill}`, fontSize: 40, fontWeight: 700, lineHeight: 1.3 }}>
            {story.headline}
          </div>
        )}

        {/* Momentum */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: MUTED, letterSpacing: 3 }}>
            <div style={{ display: "flex" }}>MOMENTUM</div>
            <div style={{ display: "flex" }}>
              <span style={{ color: home.fill === "#F5F5F5" ? INK : home.fill }}>{codes.home}</span>
              <span style={{ margin: "0 12px", color: INK }}>{share.home}% · {share.away}%</span>
              <span style={{ color: away.fill === "#F5F5F5" ? INK : away.fill }}>{codes.away}</span>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={chart} width={W - 144} height={260} style={{ marginTop: 18 }} alt="" />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: MUTED, marginTop: 8 }}>
            <div style={{ display: "flex" }}>0&apos;</div>
            <div style={{ display: "flex" }}>45&apos;</div>
            <div style={{ display: "flex" }}>{Math.max(90, flow.lastMinute)}&apos;</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 56, fontSize: 28, color: MUTED }}>
          <div style={{ display: "flex" }}>Who thinks differently than you?</div>
          <div style={{ display: "flex", color: INK, fontWeight: 700 }}>rivaly.fun</div>
        </div>
      </div>
    ),
    { width: W, height: H, headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } },
  );
}

/** A team colour as a quiet wash on the dark card (a hard split, not a blend). */
function tint(hex: string): string {
  const h = hex.replace("#", "");
  const v = Number.parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.slice(0, 6), 16) || 0;
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, 0.16)`;
}

function Team({ code, name, fill, ink }: { code: string; name: string; fill: string; ink: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 230 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 150,
          height: 150,
          borderRadius: 999,
          background: fill,
          color: ink,
          fontSize: 44,
          fontWeight: 800,
          border: "3px solid rgba(255,255,255,0.18)",
        }}
      >
        {code}
      </div>
      <div style={{ display: "flex", marginTop: 20, fontSize: 28, color: MUTED, textAlign: "center" }}>{name}</div>
    </div>
  );
}

/** The momentum bars and goal balls as a standalone SVG. */
function chartSvg(flow: ReturnType<typeof momentum>, homeFill: string, awayFill: string): string {
  const w = 936;
  const h = 260;
  const mid = h / 2;
  const domain = Math.max(90, flow.lastMinute);
  const step = w / domain;
  const peak = Math.max(6, ...flow.bars.map((b) => Math.abs(b.value)));
  const scale = (mid - 22) / peak;
  const bars = flow.bars
    .filter((b) => b.value !== 0)
    .map((b) => {
      const bh = Math.abs(b.value) * scale;
      const y = b.value > 0 ? mid - bh : mid;
      return `<rect x="${((b.minute - 1) * step + step * 0.14).toFixed(1)}" y="${y.toFixed(1)}" width="${(step * 0.72).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${b.value > 0 ? homeFill : awayFill}"/>`;
    })
    .join("");
  const goals = flow.marks
    .filter((m) => m.kind === "goal")
    .map((m) => {
      const cx = ((m.minute - 0.5) * step).toFixed(1);
      const cy = m.side === "home" ? 12 : h - 12;
      return `<circle cx="${cx}" cy="${cy}" r="11" fill="#fff" stroke="#111" stroke-width="1.5"/><path d="M${cx} ${cy - 5}l4.6 3.4-1.8 5.4h-5.6l-1.8-5.4z" fill="#111"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><line x1="${45 * step}" y1="8" x2="${45 * step}" y2="${h - 8}" stroke="#39413d" stroke-dasharray="4 6" stroke-width="2"/>${bars}<line x1="0" y1="${mid}" x2="${w}" y2="${mid}" stroke="#39413d" stroke-width="2"/>${goals}</svg>`;
}
