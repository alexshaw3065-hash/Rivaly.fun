"use client";

import { Avatar, RING_COLORS } from "./avatar";
import { BottomSheet } from "./bottom-sheet";

// The on-brand banner palette, shared with profile-view.tsx's default
// hash-derived choice — this sheet just lets you override that default.
export const BANNER_COLORS = ["var(--surface-elevated)", "var(--rival-blue-dim)", "var(--rival-green-dim)"];

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Choose color"
      className="h-9 w-9 shrink-0 rounded-full active:scale-[0.94]"
      style={{
        background: color,
        outline: active ? "2px solid var(--foreground)" : "1px solid var(--border-strong)",
        outlineOffset: 2,
        transition: "transform 150ms ease-out",
      }}
    />
  );
}

// No photo-upload pipeline exists yet (Cloudinary isn't wired up), so
// "editing your pfp/banner" honestly means picking from the same on-brand
// color set the app already derives them from by default — a real choice,
// not a fake upload button that goes nowhere. Bio stays a plain text field,
// same as before, just folded into one sheet behind a single edit affordance
// instead of a separate inline editor.
export function ProfileEditSheet({
  open,
  onClose,
  displayName,
  bio,
  onBioChange,
  ringColor,
  onRingColorChange,
  bannerColor,
  onBannerColorChange,
}: {
  open: boolean;
  onClose: () => void;
  displayName: string;
  bio: string;
  onBioChange: (v: string) => void;
  ringColor: string;
  onRingColorChange: (v: string) => void;
  bannerColor: string;
  onBannerColorChange: (v: string) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <Avatar name={displayName} size={72} ringColor={ringColor} />
          <div className="flex gap-2.5">
            {RING_COLORS.map((c) => (
              <Swatch key={c} color={c} active={c === ringColor} onClick={() => onRingColorChange(c)} />
            ))}
          </div>
          <p className="text-xs text-muted">Avatar color</p>
        </div>

        <div>
          <div
            className="h-16 rounded-lg"
            style={{ background: bannerColor, transition: "background 150ms ease" }}
          />
          <div className="mt-3 flex justify-center gap-2.5">
            {BANNER_COLORS.map((c) => (
              <Swatch key={c} color={c} active={c === bannerColor} onClick={() => onBannerColorChange(c)} />
            ))}
          </div>
          <p className="mt-2 text-center text-xs text-muted">Banner color</p>
        </div>

        <div>
          <p className="mb-2 text-xs text-muted">Bio</p>
          <textarea
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            placeholder="Add a bio..."
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-border-strong"
          />
        </div>

        <button
          onClick={onClose}
          className="rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background active:scale-[0.97]"
          style={{ transition: "transform 150ms ease-out" }}
        >
          Done
        </button>
      </div>
    </BottomSheet>
  );
}
