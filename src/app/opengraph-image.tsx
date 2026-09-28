import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cardFonts } from "@/lib/og-fonts";

// What rivaly.fun unfurls as anywhere a page doesn't draw its own card
// (home, How Rivaly works, Rooms, Arena…). Built once at deploy. Satori:
// flexbox only, every multi-child box says display:flex. The two-sided bar is
// the room's YES/NO split — the product in one shape, no invented numbers.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Rivaly — the social prediction market for football";

const BG = "#0a0a0a";
const INK = "#f5f5f5";
const MUTED = "#a3a3a3";
const YES = "#3d6bff";
const NO = "#ef4444";

// The logo PNG is a 790×316 canvas; the artwork sits at x 138–658, y 117–200.
const LOGO_SCALE = 0.62;

export default async function Image() {
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/rivaly-logo.png"))).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: BG, color: INK, fontFamily: "Geist, sans-serif", padding: "72px 80px" }}>
        <div style={{ display: "flex", width: 520 * LOGO_SCALE, height: 83 * LOGO_SCALE, overflow: "hidden", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt=""
            width={790 * LOGO_SCALE}
            height={316 * LOGO_SCALE}
            style={{ position: "absolute", left: -138 * LOGO_SCALE, top: -117 * LOGO_SCALE }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: 88 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>Your football opinion</div>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>vs theirs.</div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: MUTED }}>
            The social prediction market for football. People, not the house.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden" }}>
            <div style={{ display: "flex", flex: 3, background: YES }} />
            <div style={{ display: "flex", width: 8 }} />
            <div style={{ display: "flex", flex: 2, background: NO }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontSize: 26, fontWeight: 800 }}>
            <div style={{ display: "flex", color: YES }}>YES</div>
            <div style={{ display: "flex", color: MUTED, fontWeight: 500 }}>rivaly.fun</div>
            <div style={{ display: "flex", color: NO }}>NO</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await cardFonts() },
  );
}
