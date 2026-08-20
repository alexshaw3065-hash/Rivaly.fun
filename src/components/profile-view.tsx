"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import { formatMoney, formatMoneyCompact, repliesByAuthor, activityForProfile } from "@/lib/mock-data";
import { Avatar, hashToIndex } from "./avatar";
import { FollowButton } from "./follow-button";
import { ShareIcon, LinkIcon } from "./icons";
import { ProfileAchievements } from "./profile-achievements";
import { ProfilePnl } from "./profile-pnl";
import { ProfilePositions, allPositions, type PositionFilter } from "./profile-positions";
import { ProfileReplies } from "./profile-replies";
import { ProfileActivity } from "./profile-activity";
import { ScrollFadeRow } from "./scroll-fade-row";

type ProfileTab = "position" | "replies" | "activity";

// A flat color panel behind the avatar, deterministic per profile (same
// hash Avatar's ring color already uses) — a real cover *treatment*, not a
// fake photo. Kept inside the app's blue/green/neutral system, never a
// gradient (see globals.css's "no purple/gold/rainbow gradients" rule).
const BANNER_COLORS = ["var(--surface-elevated)", "var(--rival-blue-dim)", "var(--rival-green-dim)"];

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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground backdrop-blur-sm transition-transform duration-150 ease-out active:scale-[0.94]"
      style={{ background: "rgba(10,10,10,0.35)" }}
      title={copied ? "Copied" : "Copy profile link"}
    >
      <ShareIcon />
    </button>
  );
}

// Reddit-style header: banner → avatar overlapping it → name+Edit →
// username/followers → bio → connect socials → achievements. Follow/
// Challenge (or Edit's counterpart for a self view) float over the banner's
// top-right corner, same "actions on the cover" convention as X/Twitter —
// there's no room beside the avatar for them anymore once it overlaps the
// banner instead of sitting inline with the name.
function ProfileHeader({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [editingSocial, setEditingSocial] = useState(false);
  const [socialHandle, setSocialHandle] = useState(profile.socialHandle ?? "");

  const bannerColor = BANNER_COLORS[hashToIndex(profile.id, BANNER_COLORS.length)];

  return (
    <div>
      <div
        className="relative h-24 rounded-t-lg md:h-32"
        style={{ background: bannerColor }}
      >
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <ShareButton />
          {!isSelf && (
            <>
              <FollowButton />
              <Link
                href="/rooms/create"
                className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground backdrop-blur-sm transition-transform duration-150 ease-out active:scale-[0.97]"
                style={{ background: "rgba(10,10,10,0.35)" }}
              >
                Challenge
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="px-1">
        <div className="-mt-10 flex items-end justify-between">
          <div className="rounded-full p-1" style={{ background: "var(--background)" }}>
            <Avatar name={profile.displayName} size={80} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
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

        <div className="mt-2 flex gap-4 text-sm text-muted">
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

        {editingBio ? (
          <div className="mt-3 flex max-w-md flex-col gap-2">
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
          <p className="mt-3 max-w-md text-sm text-foreground">{bio}</p>
        ) : isSelf ? (
          <button
            onClick={() => setEditingBio(true)}
            className="hover-link mt-3 text-sm text-muted transition-colors"
          >
            + Add a bio
          </button>
        ) : null}

        {editingSocial ? (
          <div className="mt-2 flex max-w-md items-center gap-2">
            <LinkIcon />
            <input
              value={socialHandle}
              onChange={(e) => setSocialHandle(e.target.value)}
              placeholder="@handle"
              className="w-40 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-border-strong"
            />
            <button
              onClick={() => setEditingSocial(false)}
              className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background active:scale-[0.97]"
              style={{ transition: "transform 150ms ease-out" }}
            >
              Save
            </button>
          </div>
        ) : socialHandle ? (
          <button
            onClick={() => isSelf && setEditingSocial(true)}
            className="hover-link mt-2 flex items-center gap-1.5 text-sm text-muted transition-colors"
          >
            <LinkIcon />
            {socialHandle}
          </button>
        ) : isSelf ? (
          <button
            onClick={() => setEditingSocial(true)}
            className="hover-link mt-2 flex items-center gap-1.5 text-sm text-muted transition-colors"
          >
            <LinkIcon />+ Connect account
          </button>
        ) : null}

        <div className="mt-3">
          <ProfileAchievements profile={profile} />
        </div>
      </div>
    </div>
  );
}

export function ProfileView({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const [tab, setTab] = useState<ProfileTab>("position");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("open");

  const tabs: { id: ProfileTab; label: string; count: number }[] = [
    { id: "position", label: "Position", count: allPositions(profile.id).length },
    { id: "replies", label: "Replies", count: repliesByAuthor(profile.id).length },
    { id: "activity", label: "Activity", count: activityForProfile(profile.id).length },
  ];

  return (
    <>
      <ProfileHeader profile={profile} isSelf={isSelf} />

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-6">
        <div className="min-w-0 rounded-lg border border-border bg-surface p-4">
          <p className="truncate font-mono text-lg font-medium text-foreground md:text-2xl">
            {Math.round(profile.predictionAccuracy * 100)}%
          </p>
          <p className="mt-0.5 text-xs text-muted">Accuracy</p>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-surface p-4" title={formatMoney(profile.totalWinningsCents)}>
          <p className="truncate font-mono text-lg font-medium text-rival-green md:text-2xl">
            {formatMoneyCompact(profile.totalWinningsCents)}
          </p>
          <p className="mt-0.5 text-xs text-muted">Total winnings</p>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-surface p-4">
          <p className="truncate font-mono text-lg font-medium text-foreground md:text-2xl">
            {profile.roomsCreated}
          </p>
          <p className="mt-0.5 text-xs text-muted">Rooms created</p>
        </div>
      </div>

      {isSelf && (
        <div className="mt-6">
          <ProfilePnl />
        </div>
      )}

      <div className="mt-8">
        {/* One no-wrap scrollable strip, not a justify-between split — a
            split row clips/overlaps once Position+Replies+Activity's real
            counts push past the available width (hit this on a 375px
            viewport). A single segmented Open/Closed control (not two
            separate pills) plus a right-edge fade keeps everything on one
            line at typical widths and still discoverable if it ever needs
            to scroll. */}
        <ScrollFadeRow
          wrapperClassName="border-b border-border"
          className="no-scrollbar flex items-center gap-4 overflow-x-auto"
        >
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
              {t.label} ({t.count})
            </button>
          ))}

          {tab === "position" && (
            <div
              className="mb-2.5 ml-auto flex shrink-0 rounded-full border border-border p-0.5 text-xs"
            >
              {(["open", "closed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setPositionFilter(f)}
                  className="rounded-full px-2.5 py-1 capitalize transition-colors duration-150"
                  style={{
                    color: positionFilter === f ? "var(--background)" : "var(--muted)",
                    background: positionFilter === f ? "var(--foreground)" : "transparent",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </ScrollFadeRow>

        <div className="mt-6">
          {tab === "position" && <ProfilePositions profileId={profile.id} filter={positionFilter} />}
          {tab === "replies" && <ProfileReplies profileId={profile.id} />}
          {tab === "activity" && <ProfileActivity profileId={profile.id} />}
        </div>
      </div>
    </>
  );
}
