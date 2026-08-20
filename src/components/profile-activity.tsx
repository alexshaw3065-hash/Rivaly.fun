import { activityForProfile } from "@/lib/mock-data";
import { ArenaFeedCard } from "./arena-feed-card";

// A chronological personal log — reuses ArenaFeedCard's existing
// win_loss/rival_activity/banter/thesis rendering, just fed a
// profile-scoped item list instead of the global Arena feed.
export function ProfileActivity({ profileId }: { profileId: string }) {
  const items = activityForProfile(profileId);

  if (items.length === 0) {
    return <p className="py-14 text-center text-sm text-muted">No activity yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <ArenaFeedCard key={item.id} item={item} />
      ))}
    </div>
  );
}
