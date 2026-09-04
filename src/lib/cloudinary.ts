// Real avatar uploads — see docs/masterplan and CLAUDE.md's Tech Stack
// note ("planned, not yet wired up"). Client uploads straight to
// Cloudinary via its unsigned-upload API (no secret key involved, no
// Vercel function proxying the binary) — the upload_preset itself
// (configured in the Cloudinary dashboard, not here) is where
// format/size restrictions actually live.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadAvatarImage(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Photo uploads aren't configured yet.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "avatars");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed — try again.");

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error("Upload failed — try again.");
  return data.secure_url;
}

/**
 * Inserts a sizing/cropping/format transform right after "/upload/" in a
 * Cloudinary delivery URL, so every Avatar caller gets an image sized for
 * its own `size` prop from one stored URL — no need to keep multiple
 * pre-resized variants. f_auto/q_auto is Cloudinary's own format/quality
 * negotiation (serves WebP/AVIF where supported) — the actual "small
 * payload on a slow network" win. Non-Cloudinary URLs (e.g. a local
 * `blob:` preview while an upload is in flight) pass through unchanged.
 */
export function cloudinaryAvatarUrl(url: string, size: number): string {
  if (!url.includes("/upload/")) return url;
  const px = Math.round(size * 2); // 2x for retina
  return url.replace("/upload/", `/upload/w_${px},h_${px},c_fill,g_face,f_auto,q_auto/`);
}

export function isCloudinaryUrl(url: string): boolean {
  return CLOUD_NAME !== undefined && url.startsWith(`https://res.cloudinary.com/${CLOUD_NAME}/`);
}
