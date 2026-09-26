"use client";

import { useState, useTransition } from "react";
import { toggleFollow } from "@/app/profile/actions";
import { useCurrentUser } from "./current-user-provider";
import { openAuthModal } from "@/lib/auth-modal-store";

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
  variant = "default",
}: {
  profileId: string;
  initialFollowing?: boolean;
  /** "pill": the profile header's big rounded button. */
  variant?: "default" | "pill";
}) {
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
      openAuthModal({ next: window.location.pathname });
      return;
    }
    const next = !following;
    setFollowing(next); // optimistic — reverted below if the action fails
    startTransition(async () => {
      const res = await toggleFollow(profileId, following);
      if (!res.ok) setFollowing(!next);
    });
  }

  if (variant === "pill") {
    return (
      <button
        onClick={handleClick}
        disabled={pending}
        className="h-10 rounded-full px-6 text-sm font-semibold transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-70"
        style={following ? { background: "var(--foreground)", color: "var(--background)" } : { background: "var(--rival-blue)", color: "#fff" }}
      >
        {following ? "Following" : "Follow"}
      </button>
    );
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
