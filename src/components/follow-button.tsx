"use client";

import { useState } from "react";

export function FollowButton() {
  const [following, setFollowing] = useState(false);
  return (
    <button
      onClick={() => setFollowing((f) => !f)}
      className="rounded-md border px-4 py-2 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
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
