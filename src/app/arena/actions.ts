"use server";

import { createClient } from "@/lib/supabase/server";

export type CreatePostResult = { ok: true; postId: string } | { ok: false; error: string };

// Banter only for now (room_id always null) — a "thesis" composer that
// attaches a post to a room doesn't exist yet, see the plan's scope note.
export async function createPost(body: string): Promise<CreatePostResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to post." };

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Say something first." };
  if (trimmed.length > 280) return { ok: false, error: "Keep it under 280 characters." };

  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: user.id, body: trimmed })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "Couldn't post — try again." };
  return { ok: true, postId: data.id };
}

export type ToggleRoastResult = { ok: true; roasted: boolean } | { ok: false; error: string };

export async function toggleRoast(postId: string, currentlyRoasted: boolean): Promise<ToggleRoastResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to roast a take." };

  if (currentlyRoasted) {
    const { error } = await supabase.from("post_roasts").delete().eq("post_id", postId).eq("user_id", user.id);
    if (error) return { ok: false, error: "Couldn't undo — try again." };
    return { ok: true, roasted: false };
  }

  const { error } = await supabase.from("post_roasts").insert({ post_id: postId, user_id: user.id });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return { ok: false, error: "Couldn't roast — try again." };
  }
  return { ok: true, roasted: true };
}
