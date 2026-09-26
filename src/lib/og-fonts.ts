// Geist (the app's own interface face) for share images (next/og). Satori can't read the
// self-hosted woff2 files, so it takes TTF from Google Fonts, cached per
// server instance; if that fails the card still renders in the default face.
let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 500 | 800; style: "normal" }[]> | null = null;
export function cardFonts() {
  fonts ??= Promise.all(
    ([500, 800] as const).map(async (weight) => {
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Geist:wght@${weight}`)).text();
      const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
      if (!url) throw new Error("no font");
      return { name: "Geist", data: await (await fetch(url)).arrayBuffer(), weight, style: "normal" as const };
    }),
  ).catch(() => {
    fonts = null;
    return [];
  });
  return fonts;
}
