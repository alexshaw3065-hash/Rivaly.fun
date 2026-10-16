import { ImageResponse } from "next/og";
import qrcode from "qrcode-generator";
import { getRoomById } from "@/lib/supabase/rooms";
import { getMatchById } from "@/lib/supabase/matches";
import { getProfileByUsername } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";
import { getCrestMap } from "@/lib/crests/map";
import { crestKey } from "@/lib/crests/key";
import { positionOf, type Position } from "@/lib/position";
import { stadiumSvg } from "@/lib/stadium-art";
import { teamFills } from "@/lib/team-fills";
import { abbreviateClaim, competitionShort } from "@/lib/team-identity";
import { cardFonts } from "@/lib/og-fonts";
import { siteUrl } from "@/lib/site";
import type { EntrySide } from "@/lib/types";

// Someone's position in a room as a card to share, the way trading apps share
// a PnL: any time, not just after the whistle. The top half is the room's own
// stadium at night — the two clubs' colours, the sharer's end on its feet and
// holding up its YES/NO mosaic — with the real crests and the score over the
// pitch. Below: the call and how the crowd has split on it, the number (what
// it stands to win, what it won, or a calm "missed it" — never "win it back"),
// stake / pool / rivals, and who's calling it with a QR into the room that
// carries their referral. `?amounts=0` hides every figure that says what they
// staked or made, keeping the multiple and the return.
//
// Public rooms only. Rendered by next/og (Satori): flexbox only, every
// multi-child box says display:flex, images as data URIs or fetchable URLs.
// Engagement mechanisms: #5 social identity (my call, my end of the stadium),
// #2 anticipation (to win, live), #9 social proof for whoever sees it.

const W = 1080;
const H = 1350;
const ART_UNITS = 186;
const ART_TOP = 60; // the header sits on the night sky above the stands // the stadium, 400 units wide and this tall (stands + a strip of pitch)
const ART_H = Math.round((W * ART_UNITS) / 400);
const BG = "#0a0b0d";
const PANEL = "rgba(255,255,255,0.04)";
const LINE = "rgba(255,255,255,0.09)";
const INK = "#f5f5f5";
const MUTED = "#9a9aa0";
const FAINT = "#6b6b72";
const SIDE: Record<EntrySide, { ink: string; fill: string }> = {
  yes: { ink: "#86a3ff", fill: "#3d6bff" },
  no: { ink: "#ff8f8f", fill: "#ef4444" },
};
const MONEY = "#4fd18d";

const usd = (cents: number) => {
  const v = Math.abs(cents) / 100;
  return `$${v >= 1000 ? Math.round(v).toLocaleString("en-US") : v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)}`;
};
const times = (m: number) => `${m >= 10 ? m.toFixed(1) : m.toFixed(2)}×`;
const b64 = (s: string) => Buffer.from(s).toString("base64");

/** A crest as a PNG data URI (our bucket stores WebP, which the renderer can't read), or null. */
async function crestPng(name: string, map: Awaited<ReturnType<typeof getCrestMap>>): Promise<string | null> {
  const path = map.team[crestKey(name)];
  if (!path || !map.base) return null;
  try {
    const res = await fetch(map.base + path, { next: { revalidate: 86_400 } });
    if (!res.ok) return null;
    const sharp = (await import("sharp")).default;
    const png = await sharp(Buffer.from(await res.arrayBuffer())).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

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
  const crests = await getCrestMap();
  const [homeCrest, awayCrest] = await Promise.all([crestPng(match.homeTeam, crests), crestPng(match.awayTeam, crests)]);
  const { home, away, codes } = teamFills(match);
  const claim = abbreviateClaim(room.prediction, match.homeTeam, match.awayTeam);
  const yes = room.yesTotalCents ?? 0;
  const no = room.noTotalCents ?? 0;
  const yesPct = yes + no > 0 ? Math.round((yes / (yes + no)) * 100) : 50;
  const scored = match.homeScore != null && match.awayScore != null && match.status !== "scheduled";
  const when = new Date(match.kickoffAt).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  const status = match.status === "live" ? "LIVE" : match.status === "finished" ? "FULL TIME" : when.toUpperCase();
  const link = siteUrl(`/rooms/${room.id}?ref=${encodeURIComponent(profile.username)}`);
  const name = profile.displayName || profile.username;
  const avatar = profile.avatarUrl?.includes("/upload/") ? profile.avatarUrl.replace("/upload/", "/upload/w_176,h_176,c_fill,g_face,f_png/") : null;
  const art = `data:image/svg+xml;base64,${b64(stadiumSvg(match.homeTeam, match.awayTeam, pos.side, ART_UNITS))}`;
  const wordmark = new URL("/rivaly-wordmark.png", req.url).toString();

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: BG, color: INK, fontFamily: "Geist, sans-serif", position: "relative" }}>
        {/* The stadium, fading into the card */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={art} width={W} height={ART_H} style={{ position: "absolute", top: ART_TOP, left: 0 }} alt="" />
        <div style={{ display: "flex", position: "absolute", top: ART_TOP, left: 0, width: W, height: ART_H, background: `linear-gradient(180deg, rgba(10,11,13,0.6) 0%, rgba(10,11,13,0) 12%, rgba(10,11,13,0) 46%, rgba(10,11,13,0.82) 76%, ${BG} 100%)` }} />

        {/* Top line, over the roof */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "44px 64px 0" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wordmark} width={264} height={46} alt="Rivaly" />
          <div style={{ display: "flex", alignItems: "center", padding: "10px 22px", borderRadius: 99, background: "rgba(0,0,0,0.55)", border: `1px solid ${LINE}`, fontSize: 24, letterSpacing: 2, color: INK, fontWeight: 800 }}>
            {match.status === "live" && <div style={{ display: "flex", width: 12, height: 12, borderRadius: 99, background: MONEY, marginRight: 12 }} />}
            {competitionShort(match.competition)} · {status}
          </div>
        </div>

        {/* The match, over the pitch */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: ART_TOP + ART_H - 44 - 46 - 186, padding: "0 64px" }}>
          <Team crest={homeCrest} code={codes.home} name={match.homeTeam} fill={home.fill} ink={home.ink} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: scored ? 112 : 56, fontWeight: 800, letterSpacing: scored ? -4 : 0, color: scored ? INK : MUTED, whiteSpace: "nowrap", lineHeight: 1 }}>
              {scored ? `${match.homeScore}–${match.awayScore}` : "v"}
            </div>
          </div>
          <Team crest={awayCrest} code={codes.away} name={match.awayTeam} fill={away.fill} ink={away.ink} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "28px 64px 40px" }}>
          {/* The call, and how the crowd split on it */}
          <div style={{ display: "flex", flexDirection: "column", padding: "26px 34px 28px", borderRadius: 28, background: PANEL, border: `1px solid ${LINE}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: FAINT, fontWeight: 800 }}>MY CALL</div>
              <div style={{ display: "flex", padding: "7px 20px", borderRadius: 99, background: side.fill, color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>{pos.side.toUpperCase()}</div>
            </div>
            <div style={{ display: "flex", marginTop: 12, fontSize: claim.length > 24 ? 50 : 60, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.05 }}>{claim}</div>
            <div style={{ display: "flex", marginTop: 20, justifyContent: "space-between", fontSize: 22, fontWeight: 800 }}>
              <div style={{ display: "flex", color: SIDE.yes.ink }}>YES {yesPct}%</div>
              <div style={{ display: "flex", color: SIDE.no.ink }}>{100 - yesPct}% NO</div>
            </div>
            <div style={{ display: "flex", marginTop: 10, height: 12, borderRadius: 99, overflow: "hidden", background: SIDE.no.fill }}>
              <div style={{ display: "flex", width: `${yesPct}%`, background: SIDE.yes.fill }} />
            </div>
          </div>

          <Hero pos={pos} amounts={amounts} />

          {/* Stake, pool, rivals */}
          <div style={{ display: "flex", marginTop: 22 }}>
            {[
              { label: "STAKED", value: amounts ? usd(pos.stakeCents) : "—" },
              { label: "POOL", value: usd(room.poolTotalCents) },
              { label: "RIVALS", value: String(room.participantCount) },
            ].map((c, i) => (
              <div key={c.label} style={{ display: "flex", flexDirection: "column", flex: 1, paddingLeft: i ? 32 : 0, borderLeft: i ? `1px solid ${LINE}` : "none" }}>
                <div style={{ display: "flex", fontSize: 20, letterSpacing: 3, color: FAINT, fontWeight: 800 }}>{c.label}</div>
                <div style={{ display: "flex", marginTop: 4, fontSize: 38, fontWeight: 800 }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Who's calling it, and the way in */}
          <div style={{ display: "flex", alignItems: "center", marginTop: "auto", paddingTop: 24, borderTop: `1px solid ${LINE}` }}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} width={88} height={88} style={{ borderRadius: 99, border: `3px solid ${side.fill}` }} alt="" />
            ) : (
              <div style={{ display: "flex", width: 88, height: 88, borderRadius: 99, background: "#17181b", border: `3px solid ${side.fill}`, alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800 }}>
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 24, flex: 1 }}>
              <div style={{ display: "flex", fontSize: 36, fontWeight: 800 }}>{name.length > 18 ? `${name.slice(0, 17)}…` : name}</div>
              <div style={{ display: "flex", marginTop: 2, fontSize: 24, color: MUTED }}>@{profile.username}</div>
              <div style={{ display: "flex", marginTop: 12, fontSize: 24, color: INK, fontWeight: 800 }}>
                {pos.state === "open" || pos.state === "waiting" ? "Think I'm wrong? Take the other side." : "Who thinks differently than you?"}
              </div>
            </div>
            <Qr value={link} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontSize: 19, color: FAINT }}>
            <div style={{ display: "flex" }}>rivaly.fun · people play people, never the house</div>
            <div style={{ display: "flex" }}>Beta · test USDC on Solana devnet</div>
          </div>
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
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 26 }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: FAINT, fontWeight: 800 }}>{label[pos.state]}</div>
        <div style={{ display: "flex", marginTop: 4, fontSize: 118, fontWeight: 800, letterSpacing: -5, lineHeight: 1, color }}>{big}</div>
      </div>
      {winning && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", paddingBottom: 10 }}>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 800, letterSpacing: -2 }}>{times(pos.multiple)}</div>
          {amounts && <div style={{ display: "flex", marginTop: 2, fontSize: 26, color: MONEY, fontWeight: 800 }}>+{pos.roiPct}% return</div>}
        </div>
      )}
      {pos.state === "lost" && <div style={{ display: "flex", paddingBottom: 16, fontSize: 26, color: MUTED }}>Good game.</div>}
    </div>
  );
}

function Team({ crest, code, name, fill, ink }: { crest: string | null; code: string; name: string; fill: string; ink: string }) {
  const short = name.length > 18 ? `${name.slice(0, 17)}…` : name;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 320 }}>
      {crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} width={132} height={132} style={{ objectFit: "contain" }} alt="" />
      ) : (
        <div style={{ display: "flex", width: 120, height: 120, borderRadius: 99, background: fill, color: ink, alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800, border: "3px solid rgba(255,255,255,0.16)" }}>
          {code}
        </div>
      )}
      <div style={{ display: "flex", marginTop: 14, fontSize: 28, fontWeight: 800, color: INK }}>{short}</div>
    </div>
  );
}

/** The room link as a QR, one SVG path (qrcode-generator, as in address-qr.tsx). */
function Qr({ value }: { value: string }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  const q = 2;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#0a0b0d"/></svg>`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/svg+xml;base64,${b64(svg)}`} width={150} height={150} style={{ borderRadius: 14 }} alt="" />
  );
}
