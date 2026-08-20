const RING_COLORS = ["var(--rival-blue)", "var(--rival-green)", "var(--border-strong)"];

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
}: {
  name: string;
  size?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const ring = RING_COLORS[hashToIndex(name, RING_COLORS.length)];
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
