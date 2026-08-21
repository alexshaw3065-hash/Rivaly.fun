import type { SocialPlatform } from "./types";
import { XIcon, DiscordIcon, TelegramIcon, InstagramIcon, TiktokIcon, YoutubeIcon } from "@/components/icons";

export interface SocialPlatformInfo {
  platform: SocialPlatform;
  label: string;
  Icon: () => React.JSX.Element;
  // Discord has no public profile-URL scheme, so its entry has no
  // buildUrl — the UI copies the handle instead of linking out.
  buildUrl: ((handle: string) => string) | null;
}

export const socialPlatforms: SocialPlatformInfo[] = [
  { platform: "x", label: "X", Icon: XIcon, buildUrl: (h) => `https://x.com/${h.replace(/^@/, "")}` },
  { platform: "discord", label: "Discord", Icon: DiscordIcon, buildUrl: null },
  { platform: "telegram", label: "Telegram", Icon: TelegramIcon, buildUrl: (h) => `https://t.me/${h.replace(/^@/, "")}` },
  { platform: "instagram", label: "Instagram", Icon: InstagramIcon, buildUrl: (h) => `https://instagram.com/${h.replace(/^@/, "")}` },
  { platform: "tiktok", label: "TikTok", Icon: TiktokIcon, buildUrl: (h) => `https://tiktok.com/@${h.replace(/^@/, "")}` },
  { platform: "youtube", label: "YouTube", Icon: YoutubeIcon, buildUrl: (h) => `https://youtube.com/@${h.replace(/^@/, "")}` },
];

export function socialPlatformInfo(platform: SocialPlatform): SocialPlatformInfo {
  return socialPlatforms.find((p) => p.platform === platform)!;
}
