import type { Profile } from "./types";
import type { ScoreBreakdown } from "./rivaly-score";
import { formatSignedMoney, formatMoneyCompact } from "./mock-data";
import { hashToIndex, RING_COLORS } from "@/components/avatar";
import { TIER_FILTERS } from "@/components/rivaly-score-card";

const W = 720;
const H = Math.round((W * 4.3) / 3);
const CARD_TEXT = "#20180a";

// Canvas styles can't resolve CSS custom properties the way DOM elements
// do (no cascade participation), so var(--x) references from RING_COLORS
// need to be read off the actual computed root value first — this also
// means the export naturally matches whichever theme (dark/light) is
// active when it's generated.
function resolveCssColor(value: string): string {
  if (!value.startsWith("var(")) return value;
  const varName = value.slice(4, -1).trim();
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return resolved || "#3d6bff";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Draws the same content as <RivalyScoreCard/> onto an offscreen canvas —
// Canvas 2D's `ctx.filter` accepts the exact same CSS filter syntax as the
// DOM version's TIER_FILTERS, so the two stay visually consistent without
// duplicating the color-grading values.
async function renderScoreCardCanvas(profile: Profile, breakdown: ScoreBreakdown): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = await loadImage("/gold.png");
  ctx.filter = TIER_FILTERS[breakdown.tier];
  ctx.drawImage(bg, 0, 0, W, H);
  ctx.filter = "none";

  const pad = 48;
  ctx.fillStyle = CARD_TEXT;
  ctx.textBaseline = "alphabetic";

  ctx.font = "bold 120px monospace";
  ctx.textAlign = "left";
  ctx.fillText(String(breakdown.score), pad, 165);

  ctx.font = "bold 24px sans-serif";
  ctx.globalAlpha = 0.75;
  ctx.fillText(breakdown.tier.toUpperCase(), pad, 205);
  ctx.globalAlpha = 1;

  const cx = W / 2;
  const avatarCy = H * 0.42;
  const radius = 70;

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.arc(cx, avatarCy, radius + 8, 0, Math.PI * 2);
  ctx.fill();

  const ringColor = resolveCssColor(RING_COLORS[hashToIndex(profile.id, RING_COLORS.length)]);
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(cx, avatarCy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = ringColor;
  ctx.beginPath();
  ctx.arc(cx, avatarCy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#f5f5f5";
  ctx.font = "600 60px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText((profile.displayName.trim().charAt(0) || "?").toUpperCase(), cx, avatarCy + 21);

  ctx.fillStyle = CARD_TEXT;
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(profile.displayName, cx, avatarCy + radius + 55);
  ctx.globalAlpha = 0.65;
  ctx.font = "20px sans-serif";
  ctx.fillText(`@${profile.username}`, cx, avatarCy + radius + 85);
  ctx.globalAlpha = 1;

  const dividerY = H - 190;
  ctx.strokeStyle = "rgba(32,24,10,0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, dividerY);
  ctx.lineTo(W - pad, dividerY);
  ctx.stroke();

  const metrics: [string, string][] = [
    ["PNL", formatSignedMoney(breakdown.pnlCents)],
    ["Volume", formatMoneyCompact(breakdown.volumeCents)],
    ["Rooms", String(breakdown.roomsEntered)],
    ["Accuracy", `${Math.round(profile.predictionAccuracy * 100)}%`],
    ["Win Rate", `${Math.round(breakdown.winRate * 100)}%`],
  ];
  const colWidth = (W - pad * 2) / 3;
  metrics.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = pad + colWidth * col;
    const y = dividerY + 55 + row * 80;
    ctx.textAlign = "left";
    ctx.fillStyle = CARD_TEXT;
    ctx.font = "bold 28px monospace";
    ctx.fillText(value, x, y);
    ctx.globalAlpha = 0.6;
    ctx.font = "14px sans-serif";
    ctx.fillText(label.toUpperCase(), x, y + 24);
    ctx.globalAlpha = 1;
  });

  return canvas;
}

// Exports the card as a real PNG — native share sheet (mobile, hits
// Instagram/Twitter/WhatsApp directly) when available, otherwise a
// straight download. No new dependency: Canvas 2D + the Web Share API.
export async function shareScoreCard(profile: Profile, breakdown: ScoreBreakdown): Promise<void> {
  const canvas = await renderScoreCardCanvas(profile, breakdown);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;

  const fileName = `rivaly-score-${profile.username}.png`;
  const file = new File([blob], fileName, { type: "image/png" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My Rivaly Score" });
      return;
    } catch {
      // User cancelled the share sheet, or it failed — fall through to download.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
