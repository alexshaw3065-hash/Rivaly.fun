"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import { formatMoney } from "@/lib/mock-data";
import { Avatar } from "./avatar";
import { FollowButton } from "./follow-button";
import { ShareIcon } from "./icons";
import { ProfileAchievements } from "./profile-achievements";
import { ProfilePnl } from "./profile-pnl";
import { ProfilePositions } from "./profile-positions";
import { ProfileReplies } from "./profile-replies";
import { ProfileActivity } from "./profile-activity";

type ProfileTab = "position" | "replies" | "activity";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "position", label: "Position" },
  { id: "replies", label: "Replies" },
  { id: "activity", label: "Activity" },
];

function ShareButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="hover-link flex shrink-0 items-center gap-1.5 text-muted transition-colors"
      title="Copy profile link"
    >
      <ShareIcon />
      {copied && <span className="text-xs">Copied</span>}
    </button>
  );
}

// Reddit-style header + a real bio edit (self-only) — the only field
// Profile actually has to edit. Follow/Challenge only make sense on someone
// else's profile; your own gets Edit instead.
function ProfileHeader({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState(profile.bio ?? "");

  return (
    <div className="flex items-start gap-5">
      <Avatar name={profile.displayName} size={64} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            {profile.displayName}
          </h1>
          {isSelf && (
            <button
              onClick={() => setEditingBio((v) => !v)}
              className="hover-link text-sm text-muted transition-colors"
            >
              Edit
            </button>
          )}
        </div>
        <p className="font-mono text-sm text-muted">@{profile.username}</p>

        {editingBio ? (
          <div className="mt-2 flex max-w-md flex-col gap-2">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Add a bio..."
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
            />
            <button
              onClick={() => setEditingBio(false)}
              className="self-start rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background active:scale-[0.97]"
              style={{ transition: "transform 150ms ease-out" }}
            >
              Save
            </button>
          </div>
        ) : bio ? (
          <p className="mt-2 max-w-md text-sm text-foreground">{bio}</p>
        ) : isSelf ? (
          <button
            onClick={() => setEditingBio(true)}
            className="hover-link mt-2 text-sm text-muted transition-colors"
          >
            + Add a bio
          </button>
        ) : null}

        <div className="mt-3 flex gap-4 text-sm text-muted">
          <span>
            <span className="font-medium text-foreground">{profile.followerCount.toLocaleString()}</span> rivals
          </span>
          <span>
            <span className="font-medium text-foreground">{profile.followingCount}</span> following
          </span>
          <span>
            <span className="font-medium text-foreground">{profile.roomsCreated}</span> rooms
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-3">
        <ShareButton />
        {!isSelf && (
          <div className="flex gap-2">
            <FollowButton />
            <Link
              href="/rooms/create"
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              Challenge
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfileView({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const [tab, setTab] = useState<ProfileTab>("position");

  return (
    <>
      <ProfileHeader profile={profile} isSelf={isSelf} />

      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-mono text-2xl font-medium text-foreground">
            {Math.round(profile.predictionAccuracy * 100)}%
          </p>
          <p className="mt-0.5 text-xs text-muted">Accuracy</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-mono text-2xl font-medium text-rival-green">
            {formatMoney(profile.totalWinningsCents)}
          </p>
          <p className="mt-0.5 text-xs text-muted">Total winnings</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-mono text-2xl font-medium text-foreground">{profile.roomsCreated}</p>
          <p className="mt-0.5 text-xs text-muted">Rooms created</p>
        </div>
      </div>

      <div className="mt-5">
        <ProfileAchievements profile={profile} />
      </div>

      {isSelf && (
        <div className="mt-8">
          <ProfilePnl />
        </div>
      )}

      <div className="mt-10">
        <div className="flex gap-6 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="-mb-px shrink-0 border-b-2 pb-2.5 text-sm font-medium transition-colors duration-150"
              style={{
                borderColor: tab === t.id ? "var(--foreground)" : "transparent",
                color: tab === t.id ? "var(--foreground)" : "var(--muted)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "position" && <ProfilePositions profileId={profile.id} />}
          {tab === "replies" && <ProfileReplies profileId={profile.id} />}
          {tab === "activity" && <ProfileActivity profileId={profile.id} />}
        </div>
      </div>
    </>
  );
}
