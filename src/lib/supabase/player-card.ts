import { createClient } from "@/lib/supabase/server";
import type { PlayerCardData, Tier } from "@/components/profile/player-card-image";

// Server-side: a profile's card numbers from player_card() (settled public
// rooms only). Used by the card image route and the profile's share preview.
export async function getPlayerCard(username: string): Promise<PlayerCardData | null> {
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("id, username, display_name, avatar_url").eq("username", username).maybeSingle();
  if (!p) return null;
  const { data: c } = await supabase.rpc("player_card", { p_user: p.id });
  const card = (c ?? {}) as Partial<{
    rating: number | null;
    tier: Tier | null;
    played: number;
    wins: number;
    losses: number;
    profit: number;
    streak: number;
    form: ("W" | "L")[];
    attrs: PlayerCardData["attrs"];
  }>;
  const name = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(p.display_name) ? `@${p.username}` : p.display_name;
  return {
    name,
    username: p.username,
    avatarUrl: p.avatar_url,
    rating: card.rating ?? null,
    tier: card.tier ?? null,
    played: card.played ?? 0,
    wins: card.wins ?? 0,
    losses: card.losses ?? 0,
    profit: Number(card.profit ?? 0),
    streak: card.streak ?? 0,
    form: card.form ?? [],
    attrs: card.attrs ?? { acc: 0, frm: 0, str: 0, exp: 0, win: 0, fan: 0 },
  };
}
