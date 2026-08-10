/**
 * Rivaly logo mark — an approximation of the split blue/green shield-chevron,
 * rebuilt as inline SVG so it stays crisp at any size and can be animated.
 * To use the exact source asset instead, drop it in public/ and swap this for
 * an <Image>.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Rivaly"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="rivaly-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82ff" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="rivaly-green" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12e39a" />
          <stop offset="1" stopColor="#0aa66c" />
        </linearGradient>
      </defs>

      {/* Left (blue) half of the shield */}
      <path
        d="M15 20 H47 V38 L38 30 L30 42 L47 55 V88 L15 66 Z"
        fill="url(#rivaly-blue)"
      />
      {/* Right (green) half of the shield */}
      <path
        d="M85 20 H53 V38 L62 30 L70 42 L53 55 V88 L85 66 Z"
        fill="url(#rivaly-green)"
      />
      {/* Center V spark */}
      <path d="M40 52 L50 88 L60 52 L50 62 Z" fill="#e8ecf5" opacity="0.92" />
    </svg>
  );
}
