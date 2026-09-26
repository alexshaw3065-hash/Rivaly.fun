"use client";

import { useRef, useState } from "react";
import type { SocialLink } from "@/lib/types";
import { socialPlatformInfo } from "@/lib/social-platforms";
import { uploadAvatarImage, MAX_AVATAR_BYTES, ALLOWED_AVATAR_TYPES } from "@/lib/cloudinary";
import { Avatar, RING_COLORS } from "./avatar";
import { BottomSheet } from "./bottom-sheet";
import { PencilIcon, XIcon } from "./icons";
import { ProfileSocialsSheet } from "./profile-socials-sheet";

// The on-brand banner palette, shared with profile-view.tsx's default
// hash-derived choice — this sheet just lets you override that default.
import { BANNER_COLORS } from "@/lib/profile-palette";
export { BANNER_COLORS };

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Choose color"
      className="h-8 w-8 shrink-0 rounded-full active:scale-[0.94]"
      style={{
        background: color,
        outline: active ? "2px solid var(--foreground)" : "1px solid var(--border-strong)",
        outlineOffset: 2,
        transition: "transform 150ms ease-out",
      }}
    />
  );
}

function PencilBadge({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Change color"
      className="flex h-7 w-7 items-center justify-center rounded-full text-foreground"
      style={{ background: "rgba(10,10,10,0.55)" }}
    >
      <PencilIcon />
    </button>
  );
}

// Banner stays a color picker — no banner-image pipeline yet (a
// deliberate smaller-scope cut, not an oversight). The avatar itself is a
// real upload now (see cloudinary.ts): tap the photo to pick a file, tap
// the pencil badge to reveal the ring-color picker (unchanged) — two
// separate affordances on the same element, same "tap the photo to change
// it" idea as the original Reddit reference, just backed by a real upload
// where the avatar's concerned.
export function ProfileEditSheet({
  open,
  onClose,
  displayName,
  onDisplayNameChange,
  bio,
  onBioChange,
  avatarUrl,
  onAvatarUrlChange,
  ringColor,
  onRingColorChange,
  bannerColor,
  onBannerColorChange,
  socialLinks,
  onSocialLinksChange,
}: {
  open: boolean;
  onClose: () => void;
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  bio: string;
  onBioChange: (v: string) => void;
  avatarUrl: string | null;
  onAvatarUrlChange: (v: string | null) => void;
  ringColor: string;
  onRingColorChange: (v: string) => void;
  bannerColor: string;
  onBannerColorChange: (v: string) => void;
  socialLinks: SocialLink[];
  onSocialLinksChange: (links: SocialLink[]) => void;
}) {
  const [editingBanner, setEditingBanner] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [socialsOpen, setSocialsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const BIO_MAX = 160;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setUploadError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setUploadError("Keep it under 5MB.");
      return;
    }

    setUploadError(null);
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);
    setUploading(true);
    try {
      const url = await uploadAvatarImage(file);
      onAvatarUrlChange(url);
    } catch {
      setUploadError("Couldn't upload — try again.");
    } finally {
      setUploading(false);
      setPreviewUrl(null);
      URL.revokeObjectURL(blobUrl);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Edit Profile"
      headerAction={
        <button
          onClick={onClose}
          className="text-sm font-medium text-rival-blue transition-colors hover:text-foreground"
        >
          Save
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <div className="relative h-24 rounded-lg" style={{ background: bannerColor, transition: "background 150ms ease" }}>
            <div className="absolute right-2 top-2">
              <PencilBadge onClick={() => setEditingBanner((v) => !v)} />
            </div>
            <div className="absolute -bottom-8 left-3 rounded-full p-0.5" style={{ background: "var(--surface)" }}>
              <div className="relative">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Change photo"
                  className="block rounded-full transition-opacity"
                  style={{ opacity: uploading ? 0.6 : 1 }}
                >
                  <Avatar
                    name={displayName}
                    size={64}
                    ringColor={ringColor}
                    imageUrl={previewUrl ?? avatarUrl}
                  />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="absolute -bottom-1 -right-1">
                  <PencilBadge onClick={() => setEditingAvatar((v) => !v)} />
                </div>
              </div>
            </div>
          </div>

          {editingBanner && (
            <div className="enter-row mt-11 flex justify-center gap-2.5">
              {BANNER_COLORS.map((c) => (
                <Swatch key={c} color={c} active={c === bannerColor} onClick={() => onBannerColorChange(c)} />
              ))}
            </div>
          )}
          {editingAvatar && (
            <div className={`enter-row flex flex-col items-center gap-2 ${editingBanner ? "mt-3" : "mt-11"}`}>
              <div className="flex justify-center gap-2.5">
                {RING_COLORS.map((c) => (
                  <Swatch key={c} color={c} active={c === ringColor} onClick={() => onRingColorChange(c)} />
                ))}
              </div>
              {avatarUrl && (
                <button
                  onClick={() => onAvatarUrlChange(null)}
                  className="hover-link text-xs text-muted transition-colors"
                >
                  Remove photo
                </button>
              )}
            </div>
          )}
          {uploadError && <p className="mt-2 text-center text-xs text-danger-red">{uploadError}</p>}
          {!editingBanner && !editingAvatar && !uploadError && <div className="mt-9" />}
        </div>

        <div>
          <p className="text-xs text-muted">Display name</p>
          <input
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">About you</p>
            <p className="text-xs text-muted">
              {bio.length}/{BIO_MAX}
            </p>
          </div>
          <textarea
            value={bio}
            onChange={(e) => onBioChange(e.target.value.slice(0, BIO_MAX))}
            placeholder="Add a bio..."
            rows={3}
            maxLength={BIO_MAX}
            className="mt-1.5 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
          />
        </div>

        <div>
          <p className="mb-2 text-xs text-muted">Social links ({socialLinks.length} max 5)</p>
          <div className="flex flex-wrap gap-2">
            {socialLinks.map((link) => {
              const info = socialPlatformInfo(link.platform);
              return (
                <span
                  key={link.platform}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-3 pr-2 text-sm text-foreground"
                >
                  <info.Icon />
                  {link.handle}
                  <button
                    onClick={() => onSocialLinksChange(socialLinks.filter((l) => l.platform !== link.platform))}
                    aria-label={`Remove ${info.label}`}
                    className="text-muted transition-colors hover:text-foreground"
                  >
                    <XIcon />
                  </button>
                </span>
              );
            })}
            {socialLinks.length < 5 && (
              <button
                onClick={() => setSocialsOpen(true)}
                className="rounded-full border border-dashed border-border-strong px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                + Add social link
              </button>
            )}
          </div>
        </div>
      </div>

      <ProfileSocialsSheet
        open={socialsOpen}
        onClose={() => setSocialsOpen(false)}
        links={socialLinks}
        onSave={onSocialLinksChange}
      />
    </BottomSheet>
  );
}
