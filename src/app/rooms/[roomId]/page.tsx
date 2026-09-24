import Link from "next/link";
import { after } from "next/server";
import { formatMoney } from "@/lib/mock-data";
import { getRoomById, getRoomByInviteCode, splitPctFromTotals } from "@/lib/supabase/rooms";
import { getMatchById } from "@/lib/supabase/matches";
import { getProfileById } from "@/lib/supabase/profiles";
import { getMyEntryForRoom, getRoomRivals } from "@/lib/supabase/entries";
import { getRoomMessageLog, getRoomMessages } from "@/lib/supabase/messages";
import { raceFrom } from "@/lib/room-race";
import { encodeMoment, takeoverMoment } from "@/lib/match-event-label";
import { getMatchEventRows, momentsFromRows } from "@/lib/supabase/match-events";
import { buildTimeline } from "@/lib/match-timeline";
import { sportOf } from "@/lib/markets";
import { MatchTimeline } from "@/components/room/match-timeline";
import { JoinPanel } from "@/components/join-panel";
import { ChatComposer } from "@/components/chat-composer";
import { RoomResult } from "@/components/room-result";
import { RoomLive } from "@/components/room-live";
import { RoomStage } from "@/components/room/room-stage";
import { SideStands } from "@/components/room/side-stands";
import { RoomTakeSide } from "@/components/room/room-take-side";
import { settleRoom } from "@/lib/settlement/settle";
import { explorerTxUrl } from "@/lib/wallet/constants";
import { abbreviateClaim } from "@/lib/team-identity";
import type { EntrySide } from "@/lib/types";

// The heart of the product: a digital viewing centre, not a form. Per
// docs/masterplan/07-product-blueprint.md#45-room and the 2026-09-24 room
// redesign brief — the stadium is the atmosphere (room-stage.tsx), the UI is
// the structure, and the crowd (chat + real match moments + reactions)
// makes the noise. Follows the app theme: a floodlit night game in dark
// mode, a sunlit afternoon in light (see .stadium-art in globals.css).
// Match moments are system rows inline in the feed — one live feed reads
// more naturally than two. Room Rules covers the "what do I need to know"
// job pinned messages would otherwise do (cut for V1, see 08-v1-scope.md).
// Stakes close at kickoff — mirrors the lock in join_room_with_stake().
function stakesAreClosed(match: { status: string; kickoffAt: string }): boolean {
  return match.status !== "scheduled" || +new Date(match.kickoffAt) <= Date.now();
}

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ code?: string; side?: string }>;
}) {
  const { roomId } = await params;
  const { code, side } = await searchParams;
  // A private room is only visible to members — unless you arrived with its
  // invite code, which is exactly what the code is for.
  let room = await getRoomById(roomId);
  if (!room && code) {
    const byCode = await getRoomByInviteCode(code);
    if (byCode?.id === roomId) room = byCode;
  }
  const preselect: EntrySide | null = side === "yes" || side === "no" ? side : null;

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
  const stakesClosed = stakesAreClosed(match);
  const leftPct = splitPctFromTotals(room.yesTotalCents ?? 0, room.noTotalCents ?? 0);
  const settled = room.status === "settled" || room.status === "refunded";
  const outcome = room.resolvedOutcome ?? null;
  const unfinished = room.status === "open" || room.status === "live";

  // Settle on view, after the response is sent: a room whose match has
  // started or ended gets its settlement pass right away, even between cron
  // runs. Idempotent, so a concurrent cron run can't double-pay.
  if (unfinished && (match.status !== "scheduled" || outcome)) {
    after(() => settleRoom(room.id).then(() => undefined, () => undefined));
  }
  const [messages, eventRows, rivals, messageLog] = await Promise.all([
    getRoomMessages(room.id),
    getMatchEventRows(match.id),
    getRoomRivals(room.id, 200),
    getRoomMessageLog(room.id),
  ]);
  const moments = momentsFromRows(eventRows, room.id);
  // The match on one line under the stadium, with the room's pulse beneath it.
  const timeline = buildTimeline({
    sport: sportOf(match),
    kickoffAt: +new Date(match.kickoffAt),
    rows: eventRows,
    messageTimes: messageLog.map((m) => m.at),
  });
  const sides = Object.fromEntries(rivals.map((r) => [r.userId, r.side])) as Record<string, EntrySide>;
  // The stadium race, folded from the room's whole log — backers only.
  const race = raceFrom(messageLog.flatMap((m) => (sides[m.userId] ? [{ userId: m.userId, side: sides[m.userId], at: m.at }] : [])));
  const takeoverLines = race.takeovers.map((t, i) => ({
    id: `takeover-${i}`,
    roomId: room.id,
    userId: null,
    kind: "system" as const,
    body: encodeMoment(takeoverMoment(t.side)),
    createdAt: new Date(t.at).toISOString(),
  }));
  // Chat, match moments and takeovers in one feed, by time.
  const feed = [...messages, ...moments, ...takeoverLines].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const claim = abbreviateClaim(room.prediction, match.homeTeam, match.awayTeam);
  const sharePath = `/rooms/${room.id}${room.visibility === "private" ? `?code=${room.inviteCode}` : ""}`;
  const stakeLimitLabel =
    room.maxStakeCents === null ? "No limit" : `${formatMoney(room.minStakeCents)}–${formatMoney(room.maxStakeCents)}`;

  return (
    <main className="min-h-[100dvh]">
      {/* Realtime: re-renders only when the room, its entries or the match change. */}
      {unfinished && <RoomLive roomId={room.id} matchId={room.matchId} kickoffAt={match.kickoffAt} />}

      <div className="mx-auto max-w-5xl px-4 pb-10 md:px-6 md:pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_340px] md:gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <RoomStage
              roomId={room.id}
              match={match}
              claim={claim}
              creator={creator ? { displayName: creator.displayName, username: creator.username, avatarUrl: creator.avatarUrl } : null}
              sharePath={sharePath}
              outcome={outcome}
            />

            <MatchTimeline match={match} initial={timeline} />
            {outcome && (
              <RoomResult
                outcome={outcome}
                settled={settled}
                refunded={room.status === "refunded" || outcome === "void"}
                matchStillLive={match.status === "live"}
                entry={myEntry}
              />
            )}

            <SideStands
              yesCents={room.yesTotalCents ?? 0}
              noCents={room.noTotalCents ?? 0}
              poolCents={room.poolTotalCents}
              rivals={rivals}
              mySide={myEntry?.side ?? null}
              outcome={outcome}
              open={!stakesClosed && !outcome}
              sharePath={sharePath}
              claim={claim}
            />

            <ChatComposer roomId={room.id} matchId={match.id} initialMessages={feed} sides={sides} initialRace={race} />
          </div>

          <aside className="flex flex-col gap-4 md:sticky md:top-[calc(var(--header-height)+16px)] md:self-start">
            {!outcome &&
              (stakesClosed ? (
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
                  <span aria-hidden className="mt-0.5 text-rival-blue">
                    <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                      <rect x="4.5" y="8.5" width="11" height="8" rx="1.8" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M7 8.5V6.3a3 3 0 0 1 6 0v2.2" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {match.status === "live" ? "Kicked off — stakes locked" : "Stakes closed"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {myEntry ? `You're in with ${formatMoney(myEntry.amountCents)} on ${myEntry.side.toUpperCase()}. ` : ""}
                      Settles as soon as the result is certain.
                    </p>
                    {myEntry?.stakeTxSignature && (
                      <a
                        href={explorerTxUrl(myEntry.stakeTxSignature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover-link mt-1 inline-block text-xs text-muted underline underline-offset-2"
                      >
                        Verify your stake on Solana ↗
                      </a>
                    )}
                  </div>
                </div>
              ) : myEntry ? (
                <JoinPanel
                  roomId={room.id}
                  minStakeCents={room.minStakeCents}
                  maxStakeCents={room.maxStakeCents}
                  initialEntry={myEntry.side}
                  returnPath={sharePath}
                />
              ) : (
                <RoomTakeSide
                  roomId={room.id}
                  minStakeCents={room.minStakeCents}
                  maxStakeCents={room.maxStakeCents}
                  returnPath={sharePath}
                  yesPct={leftPct}
                  preselect={preselect}
                />
              ))}

            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Room rules</p>
              <dl className="mt-2.5 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Stakes</dt>
                  <dd className="text-right text-foreground">{stakeLimitLabel}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Resolves via</dt>
                  <dd className="text-right text-foreground">
                    {room.settlementMode === "auto" ? room.resolutionSource : "Creator confirms after the match"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Room</dt>
                  <dd className="text-right capitalize text-foreground">
                    {room.visibility}
                    {room.visibility === "private" && <span className="ml-2 font-mono normal-case text-muted">{room.inviteCode}</span>}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Rivals</dt>
                  <dd className="text-right text-foreground">{room.participantCount}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
        {/* Room below the pinned YES/NO bar on phones, so nothing hides under it */}
        {!outcome && !stakesClosed && !myEntry && <div aria-hidden className="h-32 md:hidden" />}
      </div>
    </main>
  );
}
