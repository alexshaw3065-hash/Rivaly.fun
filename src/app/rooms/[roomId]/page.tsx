import Link from "next/link";
import {
  formatMoney,
  splitPct,
} from "@/lib/mock-data";
import { getRoomById, splitPctFromTotals } from "@/lib/supabase/rooms";
import { getMatchById } from "@/lib/supabase/matches";
import { getProfileById } from "@/lib/supabase/profiles";
import { getMyEntryForRoom } from "@/lib/supabase/entries";
import { getRoomMessages } from "@/lib/supabase/messages";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import { LiveBadge } from "@/components/live-badge";
import { SplitBar } from "@/components/split-bar";
import { Avatar } from "@/components/avatar";
import { JoinPanel } from "@/components/join-panel";
import { ChatComposer } from "@/components/chat-composer";

// The heart of the product. Per docs/masterplan/07-product-blueprint.md#45-room.
// Timeline events are rendered as system messages inline in chat rather than a
// separate list — one live feed reads more naturally than two. Pinned
// messages / moderation tooling are cut for V1 polish (see the "ruthless V1"
// case study in docs/masterplan/08-v1-scope.md) — Room Rules below covers
// the "what do I need to know" job pinned messages would otherwise do.
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const room = await getRoomById(roomId);

  if (!room) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
        <p className="font-display text-xl font-semibold text-foreground">Room not found</p>
        <p className="mt-2 text-sm text-muted">This room doesn&rsquo;t exist or was removed.</p>
        <Link href="/" className="mt-6 inline-block text-sm text-foreground hover:underline">
          ← Back home
        </Link>
      </main>
    );
  }

  const match = (await getMatchById(room.matchId))!;
  const creator = await getProfileById(room.creatorId);
  const myEntry = await getMyEntryForRoom(room.id);
  const currentUser = await getCurrentProfile();
  const leftPct =
    room.yesTotalCents !== undefined
      ? splitPctFromTotals(room.yesTotalCents, room.noTotalCents ?? 0)
      : splitPct(room);
  const isSettled = room.status === "settled";
  const messages = await getRoomMessages(room.id);
  const payoutPerWinner = room.poolTotalCents / room.participantCount;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <Link href="/" className="hover-link text-sm text-muted transition-colors">
        ← Home
      </Link>

      {/* Header */}
      <div className="mt-4 flex items-center gap-3">
        {match.status === "live" ? (
          <LiveBadge />
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
            {match.status === "finished" ? "Full time" : "Upcoming"}
          </span>
        )}
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {match.competition}
        </span>
      </div>

      <p className="mt-2 font-mono text-sm text-muted">
        {match.homeTeam} {match.homeScore ?? "–"}–{match.awayScore ?? "–"} {match.awayTeam}
      </p>

      <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
        &ldquo;{room.prediction}&rdquo;
      </h1>

      {creator && (
        <Link
          href={`/profile/${creator.username}`}
          className="hover-link mt-3 inline-flex items-center gap-2 text-sm text-muted transition-colors"
        >
          <Avatar name={creator.displayName} size={22} imageUrl={creator.avatarUrl} />
          Created by {creator.displayName}
        </Link>
      )}

      {/* Body */}
      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="stagger-in rounded-lg border border-border bg-surface p-4">
            <SplitBar leftPct={leftPct} leftLabel="Yes" rightLabel="No" />
            <div className="mt-3 flex items-center justify-between font-mono text-xs text-muted">
              <span>{formatMoney(room.poolTotalCents)} pool</span>
              <span>{room.participantCount} rivals</span>
            </div>
          </div>

          <div
            className="stagger-in mt-6 rounded-lg border border-border bg-surface p-3"
            style={{ animationDelay: "60ms" }}
          >
            <ChatComposer roomId={room.id} initialMessages={messages} selfUserId={currentUser?.id ?? "u3"} />
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          {isSettled ? (
            <div
              className="stagger-in rounded-lg border border-border-strong bg-surface p-4"
              style={{ animationDelay: "30ms" }}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Settled</p>
              <p className="mt-1.5 text-sm text-foreground">
                {creator?.displayName ?? "The creator"} called it — {formatMoney(payoutPerWinner)} per winner.
              </p>
              <Link
                href="/rooms/create"
                className="mt-3 block rounded-md bg-foreground py-2.5 text-center text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
              >
                Rematch →
              </Link>
            </div>
          ) : (
            <div className="stagger-in" style={{ animationDelay: "30ms" }}>
              <JoinPanel roomId={room.id} entryAmountCents={room.entryAmountCents} initialEntry={myEntry} />
            </div>
          )}

          <div className="stagger-in" style={{ animationDelay: "90ms" }}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Rivals</p>
            <div className="mt-2 flex -space-x-2">
              <Avatar name="Alex" size={28} />
              <Avatar name="Daniel" size={28} />
              <Avatar name="Victor" size={28} />
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-elevated font-mono text-[10px] text-muted">
                +{Math.max(room.participantCount - 3, 0)}
              </div>
            </div>
          </div>

          <div
            className="stagger-in rounded-lg border border-border bg-surface p-4"
            style={{ animationDelay: "150ms" }}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Room rules</p>
            <dl className="mt-2.5 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Entry</dt>
                <dd className="text-foreground">{formatMoney(room.entryAmountCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Resolves via</dt>
                <dd className="text-foreground">
                  {room.settlementMode === "auto" ? room.resolutionSource : "Creator confirms after the match"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Visibility</dt>
                <dd className="capitalize text-foreground">{room.visibility}</dd>
              </div>
            </dl>
          </div>

          <div
            className="stagger-in flex items-center justify-between"
            style={{ animationDelay: "210ms" }}
          >
            <button className="hover-link text-sm text-muted transition-colors">
              Share room →
            </button>
            {!isSettled && (
              <button className="hover-link-danger text-sm text-muted transition-colors">
                Leave
              </button>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
