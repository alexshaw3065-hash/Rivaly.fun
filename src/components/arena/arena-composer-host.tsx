"use client";
import { track } from "@/lib/analytics/track";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/components/current-user-provider";
import { savePost, type NewPost } from "@/lib/arena/data";
import type { PostItem } from "@/lib/arena/model";
import { ARENA_POST_FAILED, ARENA_POSTED, closeArenaComposer, openArenaComposer, useArenaComposer } from "@/lib/arena/composer-store";
import { ArenaComposer, type RoomsLoader } from "./arena-composer";

// The one Arena composer, mounted once for the whole app (nav.tsx). Saves
// the post; if the database refuses it, the composer comes straight back
// with your text, photo and context and the reason — nothing to retype.
// Whoever opens it checks you're signed in first (signed out, there's
// nothing here to open). `save` is swappable for tests.
export function ArenaComposerHost({ save = savePost, loadRooms }: { save?: typeof savePost; loadRooms?: RoomsLoader } = {}) {
  const me = useCurrentUser();
  const pathname = usePathname();
  const { open, preset, key } = useArenaComposer();
  const [toast, setToast] = useState<{ text: string; href: string } | null>(null);

  async function post(p: NewPost, optimistic: PostItem) {
    if (!me) return;
    window.dispatchEvent(new CustomEvent(ARENA_POSTED, { detail: { item: optimistic } }));
    track("arena_post_submitted", { reply: Boolean(optimistic.parentId), call: Boolean(optimistic.side) });
    const refused = await save(me.id, p);
    if (refused) {
      window.dispatchEvent(new CustomEvent(ARENA_POST_FAILED, { detail: { id: p.id } }));
      openArenaComposer({ ...preset, body: p.body, attachment: optimistic.attachment, error: refused });
      return;
    }
    // A reply lands on its post's page; say so unless you're already there.
    const target = p.parentId ? `/arena/p/${p.parentId}` : `/arena/p/${p.id}`;
    if (p.parentId ? pathname !== target : pathname !== "/arena") {
      setToast({ text: p.parentId ? "Reply sent" : "Posted to the Arena", href: target });
      window.setTimeout(() => setToast(null), 4000);
    }
  }

  if (!me) return null;
  return (
    <>
      <ArenaComposer key={key} open={open} preset={preset} onOpenChange={(o) => !o && closeArenaComposer()} onPost={post} loadRooms={loadRooms} />
      {toast && (
        <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-8" role="status">
          <div className="flex items-center gap-3 rounded-full bg-surface-elevated py-2 pl-4 pr-2 text-body text-foreground shadow-pop edge [animation:fade-in-up_200ms_ease-out_both]">
            {toast.text}
            <Link href={toast.href} className="rounded-full px-3 py-1 text-label font-bold text-white" style={{ background: "var(--yes)" }}>
              See it
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
