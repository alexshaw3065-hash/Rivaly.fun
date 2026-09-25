import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ArenaPost } from "@/components/arena/arena-post";

// A post's own page — what a shared receipt or take links to.
export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }): Promise<Metadata> {
  const { postId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return { title: "Rivaly" };
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("body, author:profiles!posts_author_id_fkey(display_name)")
    .eq("id", postId)
    .maybeSingle();
  const row = data as unknown as { body: string; author: { display_name: string } | null } | null;
  if (!row) return { title: "Rivaly" };
  const who = row.author?.display_name ?? "A rival";
  return {
    title: `${who} on Rivaly`,
    description: row.body.slice(0, 160) || `${who} made a call on Rivaly.`,
    openGraph: { title: `${who} on Rivaly`, description: row.body.slice(0, 160) },
  };
}

export default async function ArenaPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  return (
    <main className="mx-auto min-w-0 max-w-2xl px-4 py-6 md:px-6 md:py-12">
      <ArenaPost postId={postId} />
    </main>
  );
}
