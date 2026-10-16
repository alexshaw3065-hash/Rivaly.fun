import { ImageResponse } from "next/og";
import qrcode from "qrcode-generator";
import { getRoomById } from "@/lib/supabase/rooms";
import { getMatchById } from "@/lib/supabase/matches";
import { getProfileByUsername } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";
import { positionOf, type Position } from "@/lib/position";
import { teamFills } from "@/lib/team-fills";
import { abbreviateClaim, competitionShort } from "@/lib/team-identity";
import { cardFonts } from "@/lib/og-fonts";
import { siteUrl } from "@/lib/site";
import type { EntrySide } from "@/lib/types";

// Someone's position in a room as a card to share, like a trading app's PnL
// card: any time, not just after the whistle. Before and during the match it
// shows what the call stands to win; after, what it won (or a calm "missed
// it", never a "win it back"). `?amounts=0` hides every dollar figure and
// keeps the multiple and the return, for people who'd rather not say what
// they staked. The QR opens the room with the sharer's referral on it.
//
// Public rooms only: a private room's stakes aren't anyone else's to see.
// Rendered by next/og (Satori): flexbox only, every multi-child box says
// display:flex. Engagement mechanisms: #5 social identity (my call, take the
// other side), #2 anticipation (to win, live), #9 social proof for whoever sees it.

const W = 1080;
const H = 1350;
const BG = "#0b0b0c";
const PANEL = "#141416";
const LINE = "rgba(255,255,255,0.08)";
const INK = "#f5f5f5";
const MUTED = "#9a9aa0";
const FAINT = "#6e6e74";
const SIDE: Record<EntrySide, { ink: string; fill: string; tint: string }> = {
  yes: { ink: "#7b9bff", fill: "#3d6bff", tint: "rgba(61,107,255,0.14)" },
  no: { ink: "#ff8a8a", fill: "#ef4444", tint: "rgba(239,68,68,0.14)" },
};
const MONEY = "#4fd18d";

const usd = (cents: number) => {
  const v = Math.abs(cents) / 100;
  return `$${v >= 1000 ? Math.round(v).toLocaleString("en-US") : v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`;
};
const times = (m: number) => `${m >= 10 ? m.toFixed(1) : m.toFixed(2)}×`;

export async function GET(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const q = new URL(req.url).searchParams;
  const username = q.get("u") ?? "";
  const amounts = q.get("amounts") !== "0";

  const room = await getRoomById(roomId);
  if (!room || room.visibility !== "public") return new Response("Not found", { status: 404 });
  const [match, profile] = await Promise.all([getMatchById(room.matchId), getProfileByUsername(username)]);
  if (!match || !profile) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("entries")
    .select("side, amount_cents, is_winner, payout_cents")
    .eq("room_id", room.id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!entry) return new Response("Not found", { status: 404 });

  const pos = positionOf(room, { side: entry.side as EntrySide, amountCents: entry.amount_cents, isWinner: entry.is_winner, payoutCents: entry.payout_cents });
  const side = SIDE[pos.side];
  const { home, away, codes } = teamFills(match);
  const claim = abbreviateClaim(room.prediction, match.homeTeam, match.awayTeam);
  const yes = room.yesTotalCents ?? 0;
  const no = room.noTotalCents ?? 0;
  const yesPct = yes + no > 0 ? Math.round((yes / (yes + no)) * 100) : 50;
  const scored = match.homeScore != null && match.awayScore != null && match.status !== "scheduled";
  const status =
    match.status === "live"
      ? "LIVE"
      : match.status === "finished"
        ? "FULL TIME"
        : new Date(match.kickoffAt).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).toUpperCase();
  const link = siteUrl(`/rooms/${room.id}?ref=${encodeURIComponent(profile.username)}`);
  const name = profile.displayName || profile.username;
  const avatar = profile.avatarUrl?.includes("/upload/") ? profile.avatarUrl.replace("/upload/", "/upload/w_160,h_160,c_fill,g_face,f_png/") : null;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: BG, color: INK, padding: 72, fontFamily: "Geist, sans-serif" }}>
        {/* Top line */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: MUTED, letterSpacing: 3 }}>
          <div style={{ display: "flex", color: INK, fontWeight: 800, letterSpacing: 12, fontSize: 30 }}>RIVALY</div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {match.status === "live" && <div style={{ display: "flex", width: 12, height: 12, borderRadius: 99, background: MONEY, marginRight: 12 }} />}
            {competitionShort(match.competition)} · {status}
          </div>
        </div>

        {/* The match */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 40 }}>
          <Team code={codes.home} name={match.homeTeam} fill={home.fill} ink={home.ink} />
          <div style={{ display: "flex", fontSize: scored ? 104 : 44, fontWeight: 800, color: scored ? INK : FAINT, letterSpacing: -3, whiteSpace: "nowrap" }}>
            {scored ? `${match.homeScore}–${match.awayScore}` : "v"}
          </div>
          <Team code={codes.away} name={match.awayTeam} fill={away.fill} ink={away.ink} />
        </div>

        {/* The call */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, padding: "32px 40px", borderRadius: 32, background: side.tint, border: `2px solid ${side.fill}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, letterSpacing: 4, color: side.ink, fontWeight: 800 }}>
            <div style={{ display: "flex" }}>MY CALL</div>
            <div style={{ display: "flex", padding: "8px 22px", borderRadius: 99, background: side.fill, color: "#fff", letterSpacing: 2 }}>{pos.side.toUpperCase()}</div>
          </div>
          <div style={{ display: "flex", marginTop: 18, fontSize: claim.length > 22 ? 56 : 70, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05 }}>{claim}</div>
        </div>

        {/* The number */}
        <Hero pos={pos} amounts={amounts} />

        {/* Stake, pool, rivals */}
        <div style={{ display: "flex", marginTop: 32, borderRadius: 24, background: PANEL, border: `1px solid ${LINE}` }}>
          {[
            { label: "STAKED", value: amounts ? usd(pos.stakeCents) : "—" },
            { label: "POOL", value: usd(room.poolTotalCents) },
            { label: "RIVALS", value: String(room.participantCount) },
          ].map((c, i) => (
            <div key={c.label} style={{ display: "flex", flexDirection: "column", flex: 1, padding: "22px 32px", borderLeft: i ? `1px solid ${LINE}` : "none" }}>
              <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: FAINT }}>{c.label}</div>
              <div style={{ display: "flex", marginTop: 8, fontSize: 44, fontWeight: 800 }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* The split */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 800 }}>
            <div style={{ display: "flex", color: SIDE.yes.ink }}>YES {yesPct}%</div>
            <div style={{ display: "flex", color: SIDE.no.ink }}>{100 - yesPct}% NO</div>
          </div>
          <div style={{ display: "flex", marginTop: 14, height: 16, borderRadius: 99, overflow: "hidden", background: SIDE.no.fill }}>
            <div style={{ display: "flex", width: `${yesPct}%`, background: SIDE.yes.fill }} />
          </div>
        </div>

        {/* Who, and the way in */}
        <div style={{ display: "flex", alignItems: "center", marginTop: "auto", paddingTop: 32 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} width={96} height={96} style={{ borderRadius: 99 }} alt="" />
          ) : (
            <div style={{ display: "flex", width: 96, height: 96, borderRadius: 99, background: PANEL, border: `1px solid ${LINE}`, alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 800 }}>
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 26, flex: 1 }}>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 800 }}>{name.length > 18 ? `${name.slice(0, 17)}…` : name}</div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 26, color: MUTED }}>@{profile.username}</div>
            <div style={{ display: "flex", marginTop: 14, fontSize: 24, color: INK, fontWeight: 800 }}>
              {pos.state === "open" || pos.state === "waiting" ? "Think I'm wrong? Take the other side." : "Who thinks differently than you?"}
            </div>
          </div>
          <Qr value={link} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, fontSize: 20, color: FAINT }}>
          <div style={{ display: "flex" }}>rivaly.fun · peer-to-peer, never the house</div>
          <div style={{ display: "flex" }}>Beta · test USDC on Solana devnet</div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: await cardFonts(), headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
  );
}

function Hero({ pos, amounts }: { pos: Position; amounts: boolean }) {
  const label: Record<Position["state"], string> = {
    open: "TO WIN",
    waiting: "WAITING FOR A RIVAL",
    won: "WON",
    "stake-back": "STAKE BACK",
    lost: "MISSED IT",
    refunded: "REFUNDED",
  };
  const winning = pos.state === "open" || pos.state === "won";
  const big = winning ? (amounts ? `+${usd(pos.profitCents)}` : `+${pos.roiPct}%`) : pos.state === "lost" ? (amounts ? `−${usd(pos.stakeCents)}` : "−100%") : amounts ? usd(pos.stakeCents) : "—";
  const color = winning ? MONEY : pos.state === "lost" ? INK : MUTED;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 36 }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: FAINT, fontWeight: 800 }}>{label[pos.state]}</div>
        <div style={{ display: "flex", marginTop: 6, fontSize: 140, fontWeight: 800, letterSpacing: -5, lineHeight: 1, color }}>{big}</div>
      </div>
      {winning && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", paddingBottom: 14 }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>{times(pos.multiple)}</div>
          {amounts && <div style={{ display: "flex", marginTop: 4, fontSize: 28, color: MONEY, fontWeight: 800 }}>+{pos.roiPct}%</div>}
        </div>
      )}
      {pos.state === "lost" && (
        <div style={{ display: "flex", paddingBottom: 18, fontSize: 28, color: MUTED }}>Rematch on rivaly.fun</div>
      )}
    </div>
  );
}

function Team({ code, name, fill, ink }: { code: string; name: string; fill: string; ink: string }) {
  const short = name.length > 18 ? `${name.slice(0, 17)}…` : name;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 300 }}>
      <div style={{ display: "flex", width: 96, height: 96, borderRadius: 99, background: fill, color: ink, alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, border: "3px solid rgba(255,255,255,0.16)" }}>
        {code}
      </div>
      <div style={{ display: "flex", marginTop: 14, fontSize: 28, fontWeight: 800, color: INK, textAlign: "center" }}>{short}</div>
    </div>
  );
}

/** The room link as a QR, drawn as one SVG path (qrcode-generator, as in address-qr.tsx). */
function Qr({ value }: { value: string }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const q = 2;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#0b0b0c"/></svg>`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} width={170} height={170} style={{ borderRadius: 16 }} alt="" />
  );
}
