// The share card for a take or receipt, drawn for next/og (Satori): flexbox
// only, every multi-child box says display:flex. Used by the post page's
// opengraph-image.

const BG = "#0b0e0d";
const INK = "#f4f6f5";
const MUTED = "#8b938f";
const BLUE = "#4f7cff";
const RED = "#ef4444";
const GREEN = "#1fae63";
const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CardPost {
  body: string;
  side: "yes" | "no" | null;
  author: { display_name: string; username: string | null } | null;
  room: { prediction: string; status: string; resolved_outcome: string | null; pool_total_cents: number } | null;
}

export function postCard(post: CardPost | null) {
  const name = post?.author ? (UUIDISH.test(post.author.display_name) ? `@${post.author.username}` : post.author.display_name) : "Rivaly";
  const handle = post?.author?.username ? `@${post.author.username}` : "";
  const body = post?.body ? (post.body.length > 170 ? `${post.body.slice(0, 167)}…` : post.body) : post?.room?.prediction ?? "Who thinks differently than you?";
  const room = post?.room ?? null;
  const settled = !!room && room.status === "settled" && (room.resolved_outcome === "yes" || room.resolved_outcome === "no");
  const receipt = settled && post?.side ? (post.side === room!.resolved_outcome ? "won" : "lost") : null;
  const sideColor = post?.side === "no" ? RED : BLUE;

  return (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: BG, color: INK, padding: "56px 72px", fontFamily: "Geist, sans-serif", position: "relative" }}>
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: receipt === "won" ? GREEN : post?.side ? sideColor : BLUE }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>{name}</div>
            {handle && name !== handle && <div style={{ display: "flex", fontSize: 30, color: MUTED }}>{handle}</div>}
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 10, color: MUTED }}>RIVALY</div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", fontSize: body.length > 110 ? 46 : 58, fontWeight: 700, lineHeight: 1.2, letterSpacing: -1 }}>{body}</div>

        {room && (
          <div style={{ display: "flex", alignItems: "center", gap: 28, border: `3px solid ${receipt === "won" ? GREEN : "#2a302d"}`, borderRadius: 28, padding: "24px 32px" }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 800, letterSpacing: 3, color: post?.side ? sideColor : MUTED }}>
                {post?.side ? `BACKING ${post.side.toUpperCase()}` : "ROOM"}
              </div>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>{room.prediction}</div>
            </div>
            {receipt ? (
              <div style={{ display: "flex", fontSize: 40, fontWeight: 900, letterSpacing: 2, color: receipt === "won" ? GREEN : MUTED, border: `4px solid ${receipt === "won" ? GREEN : MUTED}`, borderRadius: 16, padding: "10px 22px", transform: "rotate(-4deg)" }}>
                {receipt === "won" ? "CALLED IT" : "MISSED"}
              </div>
            ) : (
              <div style={{ display: "flex", fontSize: 30, color: MUTED }}>${Math.round(Number(room.pool_total_cents) / 100)} pot</div>
            )}
          </div>
        )}
      </div>
  );
}

// Geist (the app's own interface face) for the card. Satori can't read the
// self-hosted woff2 files, so it takes TTF from Google Fonts, cached per
// server instance; if that fails the card still renders in the default face.
let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 500 | 800; style: "normal" }[]> | null = null;
export function cardFonts() {
  fonts ??= Promise.all(
    ([500, 800] as const).map(async (weight) => {
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Geist:wght@${weight}`)).text();
      const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
      if (!url) throw new Error("no font");
      return { name: "Geist", data: await (await fetch(url)).arrayBuffer(), weight, style: "normal" as const };
    }),
  ).catch(() => {
    fonts = null;
    return [];
  });
  return fonts;
}
