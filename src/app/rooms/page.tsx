import { RoomsScreen } from "@/components/rooms-screen";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Football prediction rooms — live and open now",
  description:
    "Open football prediction rooms on Rivaly: calls on today's Premier League, Champions League and European matches. Pick a side against the people who disagree — the winner is paid automatically.",
  path: "/rooms",
});

// The screen itself is components/rooms-screen.tsx (it runs in the browser);
// this wrapper only gives the page its title and description.
export default function RoomsPage() {
  return <RoomsScreen />;
}
