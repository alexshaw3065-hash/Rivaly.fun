"use client";

import { withRef } from "@/lib/referral";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { Profile, SocialLink } from "@/lib/types";
import { formatMoney, formatMoneyCompact, formatSignedMoney } from "@/lib/mock-data";
import { fetchCardNumbers, type CardNumbers } from "@/lib/player-card-client";
import { HeadToHead } from "./profile/head-to-head";
import { FollowListSheet } from "./profile/follow-list-sheet";
import { ChallengeSheet } from "./profile/challenge-sheet";
import { socialPlatformInfo } from "@/lib/social-platforms";
import { updateProfile } from "@/app/profile/actions";
import { cloudinaryAvatarUrl, cloudinaryBannerUrl } from "@/lib/cloudinary";
import { RivalCharacter } from "./rival-character";
import { RING_COLORS, hashToIndex } from "./avatar";
import { FollowButton } from "./follow-button";
import { ShareIcon, SettingsIcon, GiftIcon, PlusIcon } from "./icons";
import { ProfileAchievements } from "./profile-achievements";
import type { AchievementStats } from "@/lib/achievements";
import { ProfilePnl } from "./profile-pnl";
import { ProfilePositions, useProfilePositions, type PositionFilter } from "./profile-positions";
import { ProfileReplies } from "./profile-replies";
import { ProfileActivity } from "./profile-activity";
import { ProfileEditSheet, BANNER_COLORS } from "./profile-edit-sheet";
import { ProfileSettingsSheet } from "./profile-settings-sheet";
import { HostLine } from "./profile/host-line";
import { ProfileSocialsSheet } from "./profile-socials-sheet";
import { RivalyScoreBadge } from "./rivaly-score-badge";
import { siteUrl } from "@/lib/site";
import { Chip, Tabs } from "./ui/controls";

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

function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = withRef(siteUrl(window.location.pathname));
    try {
      if (navigator.share) {
        await navigator.share({ title: `${name} on Rivaly`, text: `${name}'s Rivaly card — think you can beat them?`, url });
        return;
      }
    } catch {
      return; // dismissed
    }
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return (
    <IconButton onClick={() => void share()} title={copied ? "Link copied" : "Share profile"}>
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
function ProfileHeader({
  profile,
  isSelf,
  initialFollowing,
  stats,
}: {
  profile: Profile;
  isSelf: boolean;
  initialFollowing: boolean;
  stats: AchievementStats;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [socialsOpen, setSocialsOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [ringColor, setRingColor] = useState(profile.ringColor ?? RING_COLORS[hashToIndex(profile.id, RING_COLORS.length)]);
  const [bannerColor, setBannerColor] = useState(profile.bannerColor ?? BANNER_COLORS[hashToIndex(profile.id, BANNER_COLORS.length)]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(profile.bannerUrl ?? null);
  const [listTab, setListTab] = useState<"followers" | "following" | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(profile.socialLinks);
  const [, startSaveTransition] = useTransition();

  // The sheet edits live in local state as you type; closing it (Save,
  // backdrop, swipe) saves everything — colours included. If the save is
  // refused, say so right under your name instead of pretending it worked.
  function closeEditSheet() {
    setEditOpen(false);
    setSaveError(null);
    startSaveTransition(async () => {
      const res = await updateProfile({ displayName, bio, socialLinks, avatarUrl, bannerColor, ringColor, bannerUrl });
      if (!res.ok) setSaveError(res.error);
    });
  }

  return (
    <div>
      {/* The header card: a cover (photo or colour) that fades into the card,
          the avatar sitting over its edge, one main action on the right. */}
      <div className="overflow-hidden rounded-card bg-surface edge">
        <div className="relative h-44 md:h-60" style={{ background: bannerColor }}>
          {bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cloudinaryBannerUrl(bannerUrl, 1200)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, var(--surface) 100%)" }} aria-hidden />
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <ShareButton name={displayName} />
            {isSelf && (
              <>
                <IconButton onClick={() => setSettingsOpen(true)} title="Settings">
                  <SettingsIcon />
                </IconButton>
                <Link
                  href="/invite"
                  title="Invite rivals"
                  aria-label="Invite rivals"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground backdrop-blur-sm transition-transform duration-150 ease-out active:scale-[0.94]"
                  style={{ background: "rgba(10,10,10,0.35)" }}
                >
                  <GiftIcon />
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="relative -mt-12 px-5 pb-5">
          <div className="flex items-end justify-between gap-3">
            <div
              className="flex h-[92px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ background: "var(--surface-elevated)", boxShadow: `0 0 0 4px var(--surface), 0 0 0 6px ${ringColor}` }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cloudinaryAvatarUrl(avatarUrl, 92)} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <RivalCharacter name={displayName} size={70} />
              )}
            </div>
            <div className="flex items-center gap-2 pb-1">
              {isSelf ? (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="h-10 rounded-full px-5 text-body font-semibold text-foreground edge-strong transition-colors hover:bg-foreground/5"
                >
                  Edit profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setChallengeOpen(true)}
                    className="h-10 rounded-full px-5 text-body font-semibold text-foreground edge-strong transition-colors hover:bg-foreground/5"
                  >
                    Challenge
                  </button>
                  <FollowButton profileId={profile.id} initialFollowing={initialFollowing} variant="pill" />
                </>
              )}
            </div>
          </div>

          <h1 className="mt-3 text-title-1 font-display text-foreground">{displayName}</h1>
          {saveError && (
            <p role="alert" className="text-caption font-semibold text-no-ink">
              {saveError}{" "}
              <button onClick={() => setEditOpen(true)} className="underline">
                Try again
              </button>
            </p>
          )}
          {bio ? (
            <p className="mt-1 max-w-md text-body text-foreground/80">{bio}</p>
          ) : isSelf ? (
            <button onClick={() => setEditOpen(true)} className="hover-link mt-1 text-body text-secondary transition-colors">
              + Add a bio
            </button>
          ) : null}

          {/* Details line: handle and card rating, when they joined, their links. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-label text-secondary">
            <span className="flex items-center gap-1.5">
              <span>@{profile.username}</span>
              <RivalyScoreBadge profile={{ ...profile, displayName }} />
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden>
                <rect x="3" y="4.5" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M3 8.5h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Joined {new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
            </span>
            {(socialLinks.length > 0 || isSelf) && (
              <span className="flex items-center gap-1.5">
                {socialLinks.map((link) => {
                  const info = socialPlatformInfo(link.platform);
                  const url = info.buildUrl?.(link.handle);
                  const cls = "flex h-7 w-7 items-center justify-center rounded-full text-secondary edge transition-colors hover:text-foreground ";
                  return url ? (
                    <a key={link.platform} href={url} target="_blank" rel="noopener noreferrer" title={`${info.label}: ${link.handle}`} className={cls}>
                      <info.Icon />
                    </a>
                  ) : (
                    <button key={link.platform} onClick={() => navigator.clipboard.writeText(link.handle)} title={`Copy ${info.label} handle`} className={cls}>
                      <info.Icon />
                    </button>
                  );
                })}
                {isSelf && socialLinks.length < 5 && (
                  <button
                    onClick={() => setSocialsOpen(true)}
                    aria-label="Add social link"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-line-strong text-secondary transition-colors hover:text-foreground"
                  >
                    <PlusIcon />
                  </button>
                )}
              </span>
            )}
          </div>

          <div className="mt-3 flex gap-4 text-body text-secondary">
            <button type="button" onClick={() => setListTab("following")} className="hover:underline">
              <span className="font-semibold text-foreground">{profile.followingCount.toLocaleString()}</span> Following
            </button>
            <button type="button" onClick={() => setListTab("followers")} className="hover:underline">
              <span className="font-semibold text-foreground">{profile.followerCount.toLocaleString()}</span> Followers
            </button>
            <span>
              <span className="font-semibold text-foreground">{profile.roomsCreated}</span> Rooms
            </span>
          </div>
          <HostLine profileId={profile.id} isSelf={isSelf} />

          <div className="mt-3">
            <ProfileAchievements profile={profile} isSelf={isSelf} stats={stats} />
          </div>
        </div>
      </div>

      <FollowListSheet
        profileId={profile.id}
        name={displayName}
        tab={listTab}
        counts={{ followers: profile.followerCount, following: profile.followingCount }}
        onClose={() => setListTab(null)}
      />
      {!isSelf && <ChallengeSheet open={challengeOpen} onClose={() => setChallengeOpen(false)} username={profile.username} name={displayName} />}

      {isSelf && (
        <>
          <ProfileEditSheet
            open={editOpen}
            onClose={closeEditSheet}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            bio={bio}
            onBioChange={setBio}
            avatarUrl={avatarUrl}
            onAvatarUrlChange={setAvatarUrl}
            ringColor={ringColor}
            onRingColorChange={setRingColor}
            bannerColor={bannerColor}
            onBannerColorChange={setBannerColor}
            bannerUrl={bannerUrl}
            onBannerUrlChange={setBannerUrl}
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
            onSave={(next) => {
              setSocialLinks(next);
              setSaveError(null);
              startSaveTransition(async () => {
                const res = await updateProfile({ displayName, bio, socialLinks: next, avatarUrl });
                if (!res.ok) setSaveError(res.error);
              });
            }}
          />
        </>
      )}
    </div>
  );
}

export function ProfileView({
  profile,
  isSelf,
  initialFollowing = false,
}: {
  profile: Profile;
  isSelf: boolean;
  initialFollowing?: boolean;
}) {
  const [tab, setTab] = useState<ProfileTab>("position");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("open");
  const positions = useProfilePositions(profile.id);
  // The real record, from settled public rooms (the same numbers as the card).
  const [card, setCard] = useState<CardNumbers | null>(null);
  useEffect(() => {
    let live = true;
    void fetchCardNumbers(profile.id).then((c) => live && setCard(c));
    return () => {
      live = false;
    };
  }, [profile.id]);

  const tabs: { id: ProfileTab; label: string; count: number | null }[] = [
    { id: "position", label: "Position", count: positions.items.length },
    { id: "replies", label: "Replies", count: null },
    { id: "activity", label: "Activity", count: null },
  ];

  return (
    <>
      <ProfileHeader
        profile={profile}
        isSelf={isSelf}
        initialFollowing={initialFollowing}
        stats={{
          played: card?.played ?? 0,
          wins: card?.wins ?? 0,
          profit: card?.profit ?? 0,
          joined: positions.items.length,
        }}
      />

      {!isSelf && <HeadToHead other={{ id: profile.id, name: profile.displayName, username: profile.username, avatarUrl: profile.avatarUrl }} />}

      <div className="mt-8 grid grid-cols-3 gap-3">
        <div className="min-w-0 rounded-card bg-surface p-4 edge">
          <p className="truncate text-title-3 font-display tabular-nums text-foreground md:text-title-2">{card ? `${card.wins}–${card.losses}` : "–"}</p>
          <p className="mt-1 text-caption text-secondary">Record</p>
        </div>
        <div className="min-w-0 rounded-card bg-surface p-4 edge">
          <p className="truncate text-title-3 font-display tabular-nums text-foreground md:text-title-2">
            {card && card.played > 0 ? `${Math.round((card.wins / card.played) * 100)}%` : "–"}
          </p>
          <p className="mt-1 text-caption text-secondary">Accuracy</p>
        </div>
        <div className="min-w-0 rounded-card bg-surface p-4 edge" title={card ? formatMoney(Math.abs(card.profit)) : undefined}>
          <p
            className={`truncate text-title-3 font-display tabular-nums md:text-title-2 ${
              !card || card.profit === 0 ? "text-foreground" : card.profit > 0 ? "text-money-ink" : "text-no-ink"
            }`}
          >
            {card ? (card.profit === 0 ? "$0" : Math.abs(card.profit) >= 100_000 ? `${card.profit > 0 ? "+" : "−"}${formatMoneyCompact(Math.abs(card.profit))}` : formatSignedMoney(card.profit)) : "–"}
          </p>
          <p className="mt-1 text-caption text-secondary">Winnings</p>
        </div>
      </div>

      {card && (
        <div className="mt-4 flex items-center gap-3 text-label text-secondary">
          <span className="font-semibold">Form</span>
          <span className="flex gap-1.5">
            {Array.from({ length: 5 }, (_, i) => card.form[i] ?? null).map((r, i) => (
              <span
                key={i}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-micro font-bold ${
                  r ? `text-white ${r === "W" ? "bg-money" : "bg-no"}` : "text-transparent outline outline-[1.5px] -outline-offset-[1.5px] outline-line-strong"
                }`}
                aria-label={r === "W" ? "Win" : r === "L" ? "Loss" : "No result"}
              >
                {r ?? ""}
              </span>
            ))}
          </span>
          {card.played === 0 ? (
            <span>No settled rooms yet</span>
          ) : (
            card.rank !== null && (
              <Link href="/arena?tab=leaderboard" className="ml-auto font-semibold text-foreground hover:underline">
                #{card.rank} on the Leaderboard
              </Link>
            )
          )}
        </div>
      )}

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
        <Tabs tabs={tabs.map((t) => ({ id: t.id, label: t.label, count: t.count ?? undefined }))} value={tab} onChange={setTab} />

        {tab === "position" && (
          <div className="mt-4 flex gap-2">
            {(["open", "closed"] as const).map((f) => (
              <Chip key={f} selected={positionFilter === f} className="capitalize" onClick={() => setPositionFilter(f)}>
                {f}
              </Chip>
            ))}
          </div>
        )}

        <div className="mt-4">
          {tab === "position" && <ProfilePositions items={positions.items} stakes={positions.stakes} isLoading={positions.isLoading} filter={positionFilter} />}
          {tab === "replies" && <ProfileReplies profileId={profile.id} />}
          {tab === "activity" && <ProfileActivity profileId={profile.id} />}
        </div>
      </div>
    </>
  );
}
