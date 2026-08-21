// Renders the icon mark and the "RIVALY" text as two independently-sized
// crops of the exact same uploaded rivaly-logo.png — never a redraw, just
// two CSS background-position/size views into the one file. Needed
// because the source PNG bakes both into a single flat image at a fixed
// relative scale, and the icon needed to read bigger than the wordmark
// without touching the wordmark's own size (Polymarket's mark-vs-text
// balance was the reference point, not its actual logo).
//
// Bounding boxes below were measured directly off the PNG's alpha
// channel (790x316 native canvas): icon spans x[138,248] y[117,199],
// the "RIVALY" glyphs span x[290,657] y[144,190].
const NATIVE_W = 790;
const NATIVE_H = 316;
const ICON_BOX = { x: 138, y: 117, w: 110, h: 82 };
const TEXT_BOX = { x: 290, y: 144, w: 367, h: 46 };

// The wordmark's on-screen size is pinned to what already shipped (a
// 65px-tall full logo implies this scale) — "the text is okay," per the
// founder, so it must not shift when the icon grows.
const TEXT_SCALE = 65 / NATIVE_H;
// The icon gets real visual weight instead of riding along at the text's
// tiny relative scale.
const ICON_DISPLAY_HEIGHT = 44;
const ICON_SCALE = ICON_DISPLAY_HEIGHT / ICON_BOX.h;

function cropStyle(box: { x: number; y: number; w: number; h: number }, scale: number): React.CSSProperties {
  return {
    width: box.w * scale,
    height: box.h * scale,
    backgroundImage: "url(/rivaly-logo.png)",
    backgroundSize: `${NATIVE_W * scale}px ${NATIVE_H * scale}px`,
    backgroundPosition: `-${box.x * scale}px -${box.y * scale}px`,
    backgroundRepeat: "no-repeat",
  };
}

export function RivalyWordmark() {
  return (
    <span className="brand-logo flex shrink-0 items-center gap-1.5">
      <span aria-hidden style={cropStyle(ICON_BOX, ICON_SCALE)} />
      <span className="sr-only">Rivaly</span>
      <span aria-hidden style={cropStyle(TEXT_BOX, TEXT_SCALE)} />
    </span>
  );
}
