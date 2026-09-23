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
  return <CreateRoomFlow initialMatchId={matchId} />;
}
