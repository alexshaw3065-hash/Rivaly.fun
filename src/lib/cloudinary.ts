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

// ── Chat photos ───────────────────────────────────────────────────────────
// Shrunk on the phone before upload (longest side 1600px, WebP ~0.8 — a
// 3–5 MB camera photo becomes ~150–300 KB), with a tiny blurred preview the
// room sees instantly while the real one uploads. The database keeps only
// the Cloudinary public_id; delivery URLs are built here from our own cloud
// name, sized per use. See docs/plans/chat-media.md.

const PHOTO_MAX = 1600;

export interface PreparedPhoto {
  blob: Blob;
  w: number;
  h: number;
  /** ~20px-wide blurred preview as a data URL (a few hundred bytes). */
  lqip: string;
  /** Local preview for the sender while it uploads. */
  previewUrl: string;
}

export async function prepareChatPhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith("image/")) throw new Error("That isn't an image.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that image."))), "image/webp", 0.8),
  );
  const tiny = document.createElement("canvas");
  tiny.width = 20;
  tiny.height = Math.max(1, Math.round((20 * h) / w));
  tiny.getContext("2d")!.drawImage(bitmap, 0, 0, tiny.width, tiny.height);
  bitmap.close();
  return { blob, w, h, lqip: tiny.toDataURL("image/webp", 0.5), previewUrl: URL.createObjectURL(blob) };
}

/** Straight to Cloudinary (no server hop), with upload progress. Resolves to the public_id. */
export function uploadChatPhoto(blob: Blob, publicId: string, onProgress?: (p: number) => void): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) return Promise.reject(new Error("Photo uploads aren't configured yet."));
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", blob);
    form.append("upload_preset", UPLOAD_PRESET);
    form.append("public_id", publicId);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onerror = () => reject(new Error("Upload failed — check your connection."));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { public_id?: string };
        if (xhr.status < 300 && data.public_id) resolve(data.public_id);
        else reject(new Error("Upload failed — try again."));
      } catch {
        reject(new Error("Upload failed — try again."));
      }
    };
    xhr.send(form);
  });
}

/** A chat photo sized for where it's shown (2× for sharp screens), best format for the device. */
export function chatPhotoUrl(ref: string, width: number): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_limit,w_${Math.round(width)},f_auto,q_auto/${ref}`;
}
