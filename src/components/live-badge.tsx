import { LiveBadge as KitLiveBadge } from "./ui/surfaces";

// Every LIVE marker in the app goes through the kit's LiveBadge (pulsing
// ring dot, micro type) so they all look and move the same.
export function LiveBadge({ minute }: { minute?: string }) {
  return <KitLiveBadge detail={minute} />;
}
