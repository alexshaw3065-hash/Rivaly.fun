import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { cardFonts, postCard, type CardPost } from "@/components/arena/post-card-image";

// The picture a shared take or receipt unfurls as in WhatsApp, X, iMessage:
// who said it, what they said, and — for a call — the room and how it went.
// A settled call is a receipt, so it gets the stamp. Rendered by next/og
// (Satori): flexbox only, every multi-child box says display:flex.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A take on Rivaly";

export default async function Image({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data } = /^[0-9a-f-]{36}$/i.test(postId)
    ? await supabase
        .from("posts")
        .select("body, side, author:profiles!posts_author_id_fkey(display_name, username), room:rooms(prediction, status, resolved_outcome, pool_total_cents)")
        .eq("id", postId)
        .maybeSingle()
    : { data: null };
  const post = data as unknown as CardPost | null;

  return new ImageResponse(postCard(post), { ...size, fonts: await cardFonts() });
}
