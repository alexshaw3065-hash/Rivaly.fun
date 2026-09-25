"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "./chat-thread";
import { fetchPostsByAuthor, type Reply } from "@/lib/arena/data";
import { ago } from "@/lib/arena/model";

type Posted = Reply & { parentBody: string | null; parentId: string | null };

// A profile's own takes and calls from the Arena — real posts only.
export function ProfileActivity({ profileId }: { profileId: string }) {
  const [posts, setPosts] = useState<Posted[] | null>(null);
  useEffect(() => {
    let live = true;
    void fetchPostsByAuthor(profileId, false).then((p) => live && setPosts(p));
    return () => {
      live = false;
    };
  }, [profileId]);

  if (posts === null) return <div className="h-32 animate-pulse rounded-2xl bg-foreground/5" />;
  if (posts.length === 0) return <p className="py-14 text-center text-sm text-muted">No takes yet.</p>;
  return (
    <div className="flex flex-col divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
      {posts.map((p) => (
        <Link key={p.id} href={`/arena/p/${p.id}`} className="block px-4 py-3.5 transition-colors hover:bg-foreground/[0.02]">
          {p.body && <p className="whitespace-pre-wrap break-words text-[15px] leading-snug text-foreground">{p.body}</p>}
          {p.attachment && (
            <div className="mt-2">
              <Photo attachment={p.attachment} />
            </div>
          )}
          <p className="mt-1 text-xs text-muted">{ago(p.at)}</p>
        </Link>
      ))}
    </div>
  );
}
