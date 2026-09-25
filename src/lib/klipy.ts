// Klipy GIF search, called from the browser. Klipy's terms require requests
// and media loads to come from the user's own device (no proxying through
// our server), and results shown in the order returned — so this is a thin
// client with a small in-memory cache, nothing more. The key is public by
// design, like every GIF keyboard's. See docs/plans/chat-media.md.
const KEY = process.env.NEXT_PUBLIC_KLIPY_API_KEY;
const API = "https://api.klipy.com/api/v1";

export const klipyEnabled = Boolean(KEY);

/** Only Klipy media URLs are ever rendered or stored (the database checks the same). */
export const KLIPY_MEDIA = /^https:\/\/static[0-9]?\.klipy\.com\/[A-Za-z0-9_./-]{1,300}$/;

export interface KlipyGif {
  slug: string;
  title: string;
  /** Small animated preview for the picker grid. */
  thumb: { url: string; w: number; h: number };
  /** The looping video that goes in the chat (a fraction of a GIF's size). */
  video: { url: string; w: number; h: number };
  lqip?: string;
}

interface KlipyFile {
  url: string;
  width: number;
  height: number;
}
type KlipySize = Partial<Record<"gif" | "webp" | "jpg" | "mp4" | "webm", KlipyFile>>;
interface KlipyItem {
  slug: string;
  title?: string;
  type?: string;
  blur_preview?: string;
  file?: Partial<Record<"hd" | "md" | "sm" | "xs", KlipySize>>;
}

function toGif(item: KlipyItem): KlipyGif | null {
  const thumb = item.file?.sm?.webp ?? item.file?.sm?.gif;
  const video = item.file?.md?.mp4 ?? item.file?.sm?.mp4;
  if (!thumb || !video || !KLIPY_MEDIA.test(video.url)) return null;
  // Klipy's blurred previews are usually under 1 KB; skip the odd big one so
  // the stored message stays small.
  const lqip = item.blur_preview && item.blur_preview.length <= 1400 ? item.blur_preview : undefined;
  return {
    slug: item.slug,
    title: item.title ?? "GIF",
    thumb: { url: thumb.url, w: thumb.width, h: thumb.height },
    video: { url: video.url, w: video.width, h: video.height },
    lqip,
  };
}

const cache = new Map<string, { gifs: KlipyGif[]; hasNext: boolean }>();

function locale(): string | undefined {
  const region = navigator.language.split("-")[1];
  return region && /^[A-Za-z]{2}$/.test(region) ? region.toLowerCase() : undefined;
}

/** Trending when `q` is empty, search otherwise. */
export async function klipyGifs(q: string, customerId: string, page = 1): Promise<{ gifs: KlipyGif[]; hasNext: boolean }> {
  if (!KEY) throw new Error("GIFs aren't set up yet.");
  const term = q.trim();
  const cacheKey = `${term.toLowerCase()}|${page}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const params = new URLSearchParams({ page: String(page), per_page: "24", customer_id: customerId, content_filter: "medium", format_filter: "webp,mp4" });
  if (term) params.set("q", term);
  const loc = locale();
  if (loc) params.set("locale", loc);
  const res = await fetch(`${API}/${KEY}/gifs/${term ? "search" : "trending"}?${params}`);
  if (!res.ok) throw new Error(res.status === 429 ? "Too many GIF searches — give it a minute." : "Couldn't load GIFs.");
  const json = (await res.json()) as { data?: { data?: KlipyItem[]; has_next?: boolean } };
  const out = {
    gifs: (json.data?.data ?? []).map(toGif).filter((g): g is KlipyGif => g !== null),
    hasNext: Boolean(json.data?.has_next),
  };
  cache.set(cacheKey, out);
  return out;
}

/** Tells Klipy a GIF was sent (improves its results for this person). Fire and forget. */
export function klipyShared(slug: string, customerId: string, q: string) {
  if (!KEY) return;
  void fetch(`${API}/${KEY}/gifs/share/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ customer_id: customerId, q: q.trim() }),
  }).catch(() => {});
}

// Klipy wants a stable id per person; it gets a one-way hash, never our user id.
const ids = new Map<string, Promise<string>>();
export function klipyCustomerId(userId: string | undefined): Promise<string> {
  const key = userId ?? "guest";
  let id = ids.get(key);
  if (!id) {
    id = crypto.subtle.digest("SHA-256", new TextEncoder().encode(`rivaly:${key}`)).then((buf) =>
      [...new Uint8Array(buf)]
        .slice(0, 16)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );
    ids.set(key, id);
  }
  return id;
}
