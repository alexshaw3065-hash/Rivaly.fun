"use client";

import { useState } from "react";
import Link from "next/link";
import type { Profile, SocialLink } from "@/lib/types";
import { formatMoney, formatMoneyCompact, repliesByAuthor, activityForProfile } from "@/lib/mock-data";
import { socialPlatformInfo } from "@/lib/social-platforms";
import { Avatar, RING_COLORS, hashToIndex } from "./avatar";
import { FollowButton } from "./follow-button";
import { ShareIcon, PencilIcon, SettingsIcon, GiftIcon, PlusIcon } from "./icons";
import { ProfileAchievements } from "./profile-achievements";
import { ProfilePnl } from "./profile-pnl";
import { ProfilePositions, allPositions, type PositionFilter } from "./profile-positions";
import { ProfileReplies } from "./profile-replies";
import { ProfileActivity } from "./profile-activity";
import { ProfileEditSheet, BANNER_COLORS } from "./profile-edit-sheet";
import { ProfileSettingsSheet } from "./profile-settings-sheet";
import { ProfileSocialsSheet } from "./profile-socials-sheet";
import { RivalyScoreBadge } from "./rivaly-score-badge";

type ProfileTab = "position" | "replies" | "activity";

function IconButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground backdrop-blur-sm transition-transform duration-150 ease-out active:scale-[0.94]"
      style={{ background: "rgba(10,10,10,0.35)" }}
    >
      {children}
    </button>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);
  return (
    <IconButton
      onClick={() => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      title={copied ? "Copied" : "Copy profile link"}
    >
      <ShareIcon />
    </IconButton>
  );
}

// Reddit-style header: banner → avatar overlapping it → name+edit-pencil →
// username/Rivaly Score/followers → bio → connected socials → achievements.
// On your own profile the banner's top-right corner carries Share/
// Settings/Invite (referral) icons; on someone else's it carries Share
// plus Follow/Challenge — same "actions on the cover" convention as X/
// Twitter, since there's no room beside the avatar for them once it
// overlaps the banner.
function ProfileHeader({ profile, isSelf }: { profile: Profile; isSelf: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [socialsOpen, setSocialsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [ringColor, setRingColor] = useState(RING_COLORS[hashToIndex(profile.id, RING_COLORS.length)]);
  const [bannerColor, setBannerColor] = useState(BANNER_COLORS[hashToIndex(profile.id, BANNER_COLORS.length)]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(profile.socialLinks);

  return (
    <div>
      <div className="relative h-24 rounded-t-lg md:h-32" style={{ background: bannerColor }}>
        <div className="absolute right-3 top-3 flex items-center gap-2">
          <ShareButton />
          {isSelf ? (
            <>
              <IconButton onClick={() => setSettingsOpen(true)} title="Settings">
                <SettingsIcon />
              </IconButton>
              <Link
                href="/invite"
                title="Invite rivals, earn a referral bonus"
                aria-label="Invite rivals, earn a referral bonus"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground backdrop-blur-sm transition-transform duration-150 ease-out active:scale-[0.94]"
                style={{ background: "rgba(10,10,10,0.35)" }}
              >
                <GiftIcon />
              </Link>
            </>
          ) : (
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
            <Avatar name={displayName} size={80} ringColor={ringColor} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">{displayName}</h1>
          {isSelf && (
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Edit profile"
              className="text-muted transition-colors hover:text-foreground"
            >
              <PencilIcon />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm text-muted">@{profile.username}</p>
          <RivalyScoreBadge profile={{ ...profile, displayName }} />
        </div>

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

        {bio ? (
          <p className="mt-3 max-w-md text-sm text-foreground">{bio}</p>
        ) : isSelf ? (
          <button
            onClick={() => setEditOpen(true)}
            className="hover-link mt-3 text-sm text-muted transition-colors"
          >
            + Add a bio
          </button>
        ) : null}

        {(socialLinks.length > 0 || isSelf) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {socialLinks.map((link) => {
              const info = socialPlatformInfo(link.platform);
              const url = info.buildUrl?.(link.handle);
              const commonClass =
                "flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground";
              return url ? (
                <a
                  key={link.platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${info.label}: ${link.handle}`}
                  className={commonClass}
                >
                  <info.Icon />
                </a>
              ) : (
                <button
                  key={link.platform}
                  onClick={() => navigator.clipboard.writeText(link.handle)}
                  title={`Copy ${info.label} handle`}
                  className={commonClass}
                >
                  <info.Icon />
                </button>
              );
            })}
            {isSelf && socialLinks.length < 5 && (
              <button
                onClick={() => setSocialsOpen(true)}
                aria-label="Add social link"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border-strong text-muted transition-colors hover:text-foreground"
              >
                <PlusIcon />
              </button>
            )}
          </div>
        )}

        <div className="mt-3">
          <ProfileAchievements profile={profile} isSelf={isSelf} />
        </div>
      </div>

      {isSelf && (
        <>
          <ProfileEditSheet
            open={editOpen}
            onClose={() => setEditOpen(false)}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            bio={bio}
            onBioChange={setBio}
            ringColor={ringColor}
            onRingColorChange={setRingColor}
            bannerColor={bannerColor}
            onBannerColorChange={setBannerColor}
            socialLinks={socialLinks}
            onSocialLinksChange={setSocialLinks}
          />
          <ProfileSettingsSheet
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            createdAt={profile.createdAt}
          />
          <ProfileSocialsSheet
            open={socialsOpen}
            onClose={() => setSocialsOpen(false)}
            links={socialLinks}
            onSave={setSocialLinks}
          />
        </>
      )}
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
        {/* Deliberately not scrollable — every tab label + count is sized
            to provably fit at a 375px viewport, verified against the
            row's real scrollWidth. Open/Closed lives underneath, only
            while Position is the open tab — not squeezed onto this row. */}
        <div className="flex min-w-0 gap-3 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="-mb-px shrink-0 border-b-2 pb-2.5 text-[13px] font-medium transition-colors duration-150"
              style={{
                borderColor: tab === t.id ? "var(--foreground)" : "transparent",
                color: tab === t.id ? "var(--foreground)" : "var(--muted)",
              }}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {tab === "position" && (
          <div className="mt-4 flex gap-1">
            {(["open", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setPositionFilter(f)}
                className="rounded-full border px-3 py-1 text-xs capitalize active:scale-[0.97]"
                style={{
                  borderColor: positionFilter === f ? "var(--foreground)" : "var(--border)",
                  color: positionFilter === f ? "var(--foreground)" : "var(--muted)",
                  background: positionFilter === f ? "var(--surface-elevated)" : "transparent",
                  transition: "transform 150ms ease-out, border-color 150ms ease, color 150ms ease",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6">
          {tab === "position" && <ProfilePositions profileId={profile.id} filter={positionFilter} />}
          {tab === "replies" && <ProfileReplies profileId={profile.id} />}
          {tab === "activity" && <ProfileActivity profileId={profile.id} />}
        </div>
      </div>
    </>
  );
}
