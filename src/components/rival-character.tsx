import { Avatar, hashToIndex } from "./avatar";

// A little character per person, FOMO-style — drawn, not an initial in a
// circle. Everything comes from a hash of the name, so the same rival always
// looks the same: kit colour, eyes, mouth and headwear. A real uploaded photo
// always wins over the drawing.
const KITS = [
  { skin: "#3d6bff", shade: "#2a4fdb" }, // rival blue
  { skin: "#1fae63", shade: "#128a4e" }, // pitch green
  { skin: "#ef4444", shade: "#c22f2f" }, // rival red
  { skin: "#f5a524", shade: "#c9820f" }, // amber
  { skin: "#a855f7", shade: "#7e3bc2" }, // violet
  { skin: "#14b8c4", shade: "#0e8e98" }, // teal
];

export function RivalCharacter({
  name,
  size = 40,
  imageUrl,
}: {
  name: string;
  size?: number;
  imageUrl?: string | null;
}) {
  if (imageUrl) return <Avatar name={name} size={size} imageUrl={imageUrl} />;

  const kit = KITS[hashToIndex(name, KITS.length)];
  const eyes = hashToIndex(`${name}:eyes`, 3);
  const mouth = hashToIndex(`${name}:mouth`, 3);
  const hat = hashToIndex(`${name}:hat`, 4);

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className="shrink-0" role="img" aria-label={name}>
      {/* Head: a soft squircle with a darker chin for depth */}
      <rect x="4" y="5" width="32" height="32" rx="13" fill={kit.skin} />
      <path d="M4 25c0 7 6 12 13 12h6c7 0 13-5 13-12v0c-3 5-9 8-16 8s-13-3-16-8Z" fill={kit.shade} />

      {/* Eyes */}
      {eyes === 0 && (
        <>
          <circle cx="15" cy="19" r="2.4" fill="#0a0a0a" />
          <circle cx="25" cy="19" r="2.4" fill="#0a0a0a" />
          <circle cx="15.8" cy="18.2" r="0.8" fill="#fff" />
          <circle cx="25.8" cy="18.2" r="0.8" fill="#fff" />
        </>
      )}
      {eyes === 1 && (
        <>
          <path d="M12.5 19.5q2.5-3 5 0" stroke="#0a0a0a" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M22.5 19.5q2.5-3 5 0" stroke="#0a0a0a" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
      {eyes === 2 && (
        <>
          <rect x="11" y="16.5" width="18" height="5" rx="2.5" fill="#0a0a0a" />
          <rect x="13" y="17.5" width="4" height="1.4" rx="0.7" fill="#fff" opacity="0.7" />
        </>
      )}

      {/* Mouth */}
      {mouth === 0 && <path d="M15 26q5 4 10 0" stroke="#0a0a0a" strokeWidth="2" fill="none" strokeLinecap="round" />}
      {mouth === 1 && <path d="M15.5 25.5h9a4.5 4.5 0 0 1-9 0Z" fill="#0a0a0a" />}
      {mouth === 2 && <path d="M16 27h8" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" />}

      {/* Headwear */}
      {hat === 1 && <path d="M7 12c2-6 8-9 13-9s11 3 13 9c-4-1.5-8.5-2.3-13-2.3S11 10.5 7 12Z" fill="#0a0a0a" opacity="0.85" />}
      {hat === 2 && <rect x="5" y="9.5" width="30" height="3.2" rx="1.6" fill="#f5f5f5" opacity="0.9" />}
      {hat === 3 && (
        <path d="m13 8 3.5 3 3.5-5 3.5 5 3.5-3-1.4 5.5H14.4Z" fill="#f5c542" stroke="#0a0a0a" strokeWidth="0.8" strokeLinejoin="round" />
      )}
    </svg>
  );
}
