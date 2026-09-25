"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPostsByAuthor, type Reply } from "@/lib/arena/data";
import { ago } from "@/lib/arena/model";

type Posted = Reply & { parentBody: string | null; parentId: string | null };

// Every reply this profile has posted in the Arena, with what it answered.
export function ProfileReplies({ profileId }: { profileId: string }) {
  const [replies, setReplies] = useState<Posted[] | null>(null);
  useEffect(() => {
    let live = true;
    void fetchPostsByAuthor(profileId, true).then((r) => live && setReplies(r));
    return () => {
      live = false;
    };
  }, [profileId]);

  if (replies === null) return <div className="h-32 animate-pulse rounded-2xl bg-foreground/5" />;
  if (replies.length === 0) return <p className="py-14 text-center text-sm text-muted">No replies yet.</p>;
  return (
    <div className="flex flex-col divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
      {replies.map((r) => (
        <Link key={r.id} href={r.parentId ? `/arena/p/${r.parentId}` : "/arena"} className="flex flex-col gap-1.5 px-4 py-3.5 transition-colors hover:bg-foreground/[0.02]">
          <p className="text-sm text-foreground">{r.body}</p>
          <p className="truncate text-xs text-muted">
            Replying to <span className="text-foreground">{r.parentBody || "a post"}</span> · {ago(r.at)}
          </p>
        </Link>
      ))}
    </div>
  );
}
