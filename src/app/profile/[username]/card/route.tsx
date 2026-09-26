import { ImageResponse } from "next/og";
import { getPlayerCard } from "@/lib/supabase/player-card";
import { CARD_H, CARD_W, playerCard } from "@/components/profile/player-card-image";
import { cardFonts } from "@/lib/og-fonts";
import { characterDataUrl } from "@/lib/rival-character-art";

// The Rivaly card as one PNG (portrait, transparent around the shield) — the
// profile's card sheet shows it and "Share" sends exactly this file.
export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const card = await getPlayerCard(username);
  if (!card) return new Response("Not found", { status: 404 });
  const tier = card.tier ?? "bronze";
  const artRes = await fetch(new URL(`/card-${tier}.png`, req.url));
  const art = `data:image/png;base64,${Buffer.from(await artRes.arrayBuffer()).toString("base64")}`;
  // The drawn character goes in as a plain SVG image (Satori can't render React components).
  const character = characterDataUrl(card.name, 360);
  return new ImageResponse(playerCard(card, art, character), {
    width: CARD_W,
    height: CARD_H,
    fonts: await cardFonts(),
    headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
  });
}
