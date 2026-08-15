import Link from "next/link";
import { profiles, roomById, matchById, profileById, formatMoney } from "@/lib/mock-data";
import { Avatar } from "@/components/avatar";

// A core network effect for V1, not a nice-to-have — see
// docs/masterplan/08-v1-scope.md. Feed per
// docs/masterplan/07-product-blueprint.md#413-following: New Rooms, Friends
// Online, Challenges, Big Wins — modeled here as one chronological feed
// rather than four separate lists, since that's how the emotion-design doc
// frames it ("Daniel challenged Alex," "24 people joined the prediction").
type Activity = {
  id: string;
  profileId: string;
  verb: string;
  roomId: string;
  win?: number;
};

const activity: Activity[] = [
  { id: "a1", profileId: "u3", verb: "created a room", roomId: "r2" },
  { id: "a2", profileId: "u2", verb: "created a room", roomId: "r3" },
  { id: "a3", profileId: "u2", verb: "joined", roomId: "r1" },
  { id: "a4", profileId: "u1", verb: "called it", roomId: "r4", win: 1_467_00 },
];

export default function FollowingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Following</h1>
      <p className="mt-1 text-sm text-muted">
        What the people and creators you follow are doing right now.
      </p>

      <div className="mt-7 flex items-center gap-4 rounded-lg border border-border bg-surface px-5 py-4">
        <div className="flex -space-x-2.5">
          {profiles.map((p) => (
            <div key={p.id} className="relative">
              <Avatar name={p.displayName} size={32} />
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
                style={{ background: "var(--rival-green)", borderColor: "var(--surface)" }}
              />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{profiles.length} rivals</span> online
          right now.
        </p>
      </div>

      <div className="mt-8 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
        {activity.map((item) => {
          const profile = profileById(item.profileId)!;
          const room = roomById(item.roomId)!;
          const match = matchById(room.matchId)!;
          return (
            <Link
              key={item.id}
              href={`/rooms/${room.id}`}
              className="flex items-start gap-3 px-4 py-4 transition-colors duration-150 hover:bg-surface-elevated"
            >
              <Avatar name={profile.displayName} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{profile.displayName}</span>{" "}
                  <span className="text-muted">{item.verb}</span> — &ldquo;{room.prediction}&rdquo;
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted">{match.competition}</p>
              </div>
              {item.win !== undefined && (
                <p className="shrink-0 font-mono text-sm font-medium text-rival-green">
                  +{formatMoney(item.win)}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
