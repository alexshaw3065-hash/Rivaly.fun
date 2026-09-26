import { Avatar } from "./avatar";
import { characterMarkup } from "@/lib/rival-character-art";

// A little character per person, FOMO-style — drawn, not an initial in a
// circle. The drawing lives in rival-character-art.ts (shared with the
// server-made Rivaly card). A real uploaded photo always wins over it.
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
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className="shrink-0"
      role="img"
      aria-label={name}
      dangerouslySetInnerHTML={{ __html: characterMarkup(name) }}
    />
  );
}
