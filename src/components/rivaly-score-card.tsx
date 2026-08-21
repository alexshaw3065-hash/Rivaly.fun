import type { Profile } from "@/lib/types";
import type { ScoreBreakdown } from "@/lib/rivaly-score";
import { formatSignedMoney, formatMoneyCompact } from "@/lib/mock-data";
import { Avatar, hashToIndex, RING_COLORS } from "./avatar";

// Derives silver/bronze from the one gold texture the founder provided
// (public/gold.png) via CSS color grading, tuned to read as a distinct
// metal rather than just "dimmer gold" — see score-card-export.ts for the
// canvas equivalent used when exporting this as an image.
export const TIER_FILTERS: Record<ScoreBreakdown["tier"], string> = {
  gold: "none",
  silver: "grayscale(0.9) brightness(1.3) contrast(1.05)",
  bronze: "sepia(0.6) saturate(1.7) hue-rotate(-18deg) brightness(0.82) contrast(1.1)",
};

const CARD_TEXT = "#20180a";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-sm font-bold" style={{ color: CARD_TEXT }}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: CARD_TEXT, opacity: 0.6 }}>
        {label}
      </p>
    </div>
  );
}

export function RivalyScoreCard({ profile, breakdown }: { profile: Profile; breakdown: ScoreBreakdown }) {
  const ringColor = RING_COLORS[hashToIndex(profile.id, RING_COLORS.length)];

  return (
    <div
      className="relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl shadow-lg"
      style={{ aspectRatio: "3 / 4.3" }}
    >
      <img
        src="/gold.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: TIER_FILTERS[breakdown.tier] }}
      />

      <div className="relative flex h-full flex-col p-5">
        <div>
          <p className="font-mono text-5xl font-bold leading-none" style={{ color: CARD_TEXT }}>
            {breakdown.score}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest" style={{ color: CARD_TEXT, opacity: 0.75 }}>
            {breakdown.tier}
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <div className="rounded-full p-1" style={{ background: "rgba(255,255,255,0.35)" }}>
            <Avatar name={profile.displayName} size={72} ringColor={ringColor} />
          </div>
          <p className="text-lg font-bold" style={{ color: CARD_TEXT }}>
            {profile.displayName}
          </p>
          <p className="text-xs" style={{ color: CARD_TEXT, opacity: 0.65 }}>
            @{profile.username}
          </p>
        </div>

        <div
          className="grid grid-cols-3 gap-x-2 gap-y-3 border-t pt-3"
          style={{ borderColor: "rgba(32,24,10,0.2)" }}
        >
          <Metric label="PNL" value={formatSignedMoney(breakdown.pnlCents)} />
          <Metric label="Volume" value={formatMoneyCompact(breakdown.volumeCents)} />
          <Metric label="Rooms" value={String(breakdown.roomsEntered)} />
          <Metric label="Accuracy" value={`${Math.round(profile.predictionAccuracy * 100)}%`} />
          <Metric label="Win Rate" value={`${Math.round(breakdown.winRate * 100)}%`} />
        </div>
      </div>
    </div>
  );
}
