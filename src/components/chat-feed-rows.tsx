import type { CSSProperties, ReactNode } from "react";

interface FeedRowItem {
  id: string;
}

// A real scrolling-and-fading chat stack — matches an actual Twitch/
// YouTube Live chat: the whole stack slides up by one row as a new
// message arrives, while the oldest visible row slides up and out
// (translateY + fade) instead of just popping out of place in a static
// list. Rows are absolutely positioned by slot (not flex/DOM-order
// stacking), so every row's position is driven by a CSS custom property
// and animates via a plain transition — the newly-mounted row's entrance
// uses @starting-style (see .chat-feed-row in globals.css), the same
// technique already used for other enter states in this app.
export function ChatFeedRows<T extends FeedRowItem>({
  items,
  retiringId,
  rowHeight,
  renderRow,
}: {
  items: T[]; // oldest first, newest last — may include one extra
  // "retiring" item at the front while it animates out
  retiringId: string | null;
  rowHeight: number;
  renderRow: (item: T) => ReactNode;
}) {
  const visibleCount = retiringId ? items.length - 1 : items.length;

  return (
    <div className="relative" style={{ height: visibleCount * rowHeight }}>
      {items.map((item, i) => {
        const isRetiring = item.id === retiringId;
        const slot = isRetiring ? -1 : i - (retiringId ? 1 : 0);
        return (
          <div
            key={item.id}
            className={`chat-feed-row absolute inset-x-0${isRetiring ? " chat-feed-row-exit" : ""}`}
            style={
              {
                height: rowHeight,
                "--slot": slot,
                "--row-h": `${rowHeight}px`,
              } as CSSProperties
            }
          >
            {renderRow(item)}
          </div>
        );
      })}
    </div>
  );
}
