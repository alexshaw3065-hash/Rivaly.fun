import Link from "next/link";
import { repliesByAuthor, roomById } from "@/lib/mock-data";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Every reply this profile has actually posted, with the parent post for
// context — links back into the room if the parent was a thesis post.
export function ProfileReplies({ profileId }: { profileId: string }) {
  const replies = repliesByAuthor(profileId);

  if (replies.length === 0) {
    return <p className="py-14 text-center text-sm text-muted">No replies yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {replies.map(({ post, reply }, i) => {
        const room = post.roomId ? roomById(post.roomId) : null;
        return (
          <div key={`${post.id}-${i}`} className="flex flex-col gap-1.5 px-4 py-3.5">
            <p className="text-sm text-foreground">{reply.body}</p>
            <p className="text-xs text-muted">
              Replying to <span className="text-foreground">&ldquo;{post.body}&rdquo;</span>
              {room && (
                <>
                  {" · "}
                  <Link href={`/rooms/${room.id}`} className="hover-link text-rival-blue transition-colors">
                    {room.prediction}
                  </Link>
                </>
              )}
              {" · "}
              {formatDate(reply.createdAt)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
