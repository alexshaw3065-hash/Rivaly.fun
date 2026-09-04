import Image from "next/image";
import { cloudinaryAvatarUrl } from "@/lib/cloudinary";

export const RING_COLORS = ["var(--rival-blue)", "var(--rival-green)", "var(--border-strong)"];

// Exported so other profile-header pieces (the banner color) can derive a
// deterministic value from the same name without duplicating the hash.
export function hashToIndex(input: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash % mod;
}

export function Avatar({
  name,
  size = 32,
  ringColor,
  imageUrl,
}: {
  name: string;
  size?: number;
  // Lets a profile owner pick their own ring color (see profile-edit-sheet)
  // instead of always taking the deterministic hash-derived default.
  ringColor?: string;
  // A real uploaded photo (see cloudinary.ts) — undefined/null falls back
  // to the initials below exactly as before, so every existing caller
  // that doesn't pass this is unaffected.
  imageUrl?: string | null;
}) {
  const ring = ringColor ?? RING_COLORS[hashToIndex(name, RING_COLORS.length)];

  if (imageUrl) {
    return (
      <Image
        src={cloudinaryAvatarUrl(imageUrl, size)}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size, border: `1.5px solid ${ring}` }}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-elevated font-medium text-foreground"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        border: `1.5px solid ${ring}`,
      }}
    >
      {initial}
    </div>
  );
}
