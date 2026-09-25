import { createAdminClient } from "@/lib/supabase/admin";
import type { ChatAttachment } from "@/lib/supabase/message-mapper";

// Chat photos live 60 days. Once a day this deletes older ones from
// Cloudinary and marks their messages expired — the message stays, with its
// blurred preview and a "Photo expired" label. Pinged daily by the Render
// worker (see worker/src/index.ts).
//
// Guarded by CRON_SECRET: it writes with the service role and holds the
// Cloudinary API secret, so it must never be publicly invocable.
const KEEP_DAYS = 60;
const BATCH = 100; // Cloudinary deletes up to 100 per call
const MAX_BATCHES = 20;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !apiSecret) {
    return Response.json({ error: "Cloudinary API key/secret are not configured" }, { status: 500 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
  const auth = `Basic ${Buffer.from(`${key}:${apiSecret}`).toString("base64")}`;
  let expired = 0;

  try {
    for (let i = 0; i < MAX_BATCHES; i++) {
      const { data, error } = await admin
        .from("messages")
        .select("id, attachment")
        .eq("attachment->>type", "image")
        .is("attachment->>expired", null)
        .lt("created_at", cutoff)
        .limit(BATCH);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as { id: string; attachment: ChatAttachment }[];
      if (rows.length === 0) break;

      const params = new URLSearchParams();
      for (const r of rows) if (r.attachment.ref) params.append("public_ids[]", r.attachment.ref);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload?${params}`, {
        method: "DELETE",
        headers: { authorization: auth },
      });
      if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${(await res.text()).slice(0, 200)}`);

      // "deleted" and "not_found" both mean the file is gone.
      const results = await Promise.all(
        rows.map((r) => admin.from("messages").update({ attachment: { ...r.attachment, expired: true } }).eq("id", r.id)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw new Error(failed.error.message);
      expired += rows.length;
      if (rows.length < BATCH) break;
    }
    return Response.json({ ok: true, expired });
  } catch (e) {
    return Response.json({ ok: false, expired, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
