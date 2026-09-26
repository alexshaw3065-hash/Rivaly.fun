"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CreateRoomFlow } from "@/components/create-room-flow";

// useSearchParams needs a Suspense boundary around whatever reads it (Next
// bails out of static rendering otherwise) — same split used by
// src/app/rooms/page.tsx for the same reason.
export default function CreateRoomPage() {
  return (
    <Suspense fallback={null}>
      <CreateRoomPageContent />
    </Suspense>
  );
}

function CreateRoomPageContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("matchId") ?? undefined;
  // ?resume=1: coming back from the sign-in that "Throw down" triggered.
  const resume = searchParams.get("resume") === "1";
  // ?vs=username: a challenge from someone's profile — the room is made for them.
  const vsRaw = searchParams.get("vs");
  const vs = vsRaw && /^[a-z0-9_]{3,20}$/i.test(vsRaw) ? vsRaw : undefined;
  return <CreateRoomFlow initialMatchId={matchId} resume={resume} vs={vs} />;
}
