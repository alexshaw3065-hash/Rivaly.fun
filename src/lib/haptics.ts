// One vocabulary for touch feedback, from the emotion spec
// (docs/masterplan/06-emotion-design.md, "Haptics"): not every tap vibrates —
// only the moments that mean something, and never as punishment. Android
// Chrome only (iOS Safari has no Vibration API); a no-op everywhere else.
//
//   tick     — a light acknowledgement: a reaction, a shout, a long-press,
//              creating a room, a friend joining, a stake going in
//   medium   — something happened in the match: a goal, a stadium takeover
//   success  — you called it (one satisfying pulse)
//   soft     — it didn't go your way (gentle, never a buzz of shame)

export type HapticKind = "tick" | "medium" | "success" | "soft";

const PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 8,
  medium: [30, 50, 30],
  success: [20, 40, 60],
  soft: 12,
};

export function haptic(kind: HapticKind): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Some browsers throw before the user has interacted with the page — harmless.
  }
}
