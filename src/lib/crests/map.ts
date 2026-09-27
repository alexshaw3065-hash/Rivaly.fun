import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Which teams and leagues have a real badge, and where it lives. Read once
// per 10 minutes on the server (the table is public, so the anon key — no
// cookies, cacheable) and handed to CrestProvider by the root layout, so no
// crest ever costs a lookup of its own. File names only (~25 chars each):
// the bucket prefix is added on the client.

import { EMPTY_CRESTS, type CrestMap } from "./map-types";

export type { CrestMap };

const load = unstable_cache(
  async (): Promise<CrestMap> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return EMPTY_CRESTS;
    const { data, error } = await createClient(url, key, { auth: { persistSession: false } })
      .from("crests")
      .select("kind, name_key, path")
      .limit(5000);
    if (error || !data) return EMPTY_CRESTS;
    const map: CrestMap = { base: `${url}/storage/v1/object/public/crests/`, team: {}, league: {} };
    for (const c of data) map[c.kind as "team" | "league"][c.name_key] = c.path;
    return map;
  },
  ["crest-map-v1"],
  { revalidate: 600, tags: ["crests"] },
);

export async function getCrestMap(): Promise<CrestMap> {
  try {
    return await load();
  } catch {
    return EMPTY_CRESTS; // never let crests break a page
  }
}
