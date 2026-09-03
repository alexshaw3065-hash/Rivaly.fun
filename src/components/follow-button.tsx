"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/profile/actions";
import { useCurrentUser } from "./current-user-provider";

// Real ids are UUIDs; mock profile ids are short "u1"-style strings —
// following a mock profile can't be persisted (the follows table's FK
// requires both sides to be real profiles rows), so that case keeps the
// original local-only toggle. Following a real profile calls the real
// action; the RLS-enforced follows table is the source of truth, with
// initialFollowing (server-fetched) as the starting point so a page load
// already shows the correct state instead of always starting at "Follow".
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function FollowButton({
  profileId,
  initialFollowing = false,
}: {
  profileId: string;
  initialFollowing?: boolean;
}) {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const isRealTarget = UUID_RE.test(profileId);
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!isRealTarget) {
      setFollowing((f) => !f);
      return;
    }
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !following;
    setFollowing(next); // optimistic — reverted below if the action fails
    startTransition(async () => {
      const res = await toggleFollow(profileId, following);
      if (!res.ok) setFollowing(!next);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="rounded-md border px-4 py-2 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-70"
      style={{
        borderColor: following ? "var(--border)" : "var(--rival-blue)",
        background: following ? "transparent" : "var(--rival-blue)",
        color: following ? "var(--foreground)" : "#fff",
      }}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
