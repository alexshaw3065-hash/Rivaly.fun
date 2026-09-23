import Link from "next/link";
import { after } from "next/server";
import { formatMoney } from "@/lib/mock-data";
import { getRoomById, getRoomByInviteCode, splitPctFromTotals } from "@/lib/supabase/rooms";
import { getMatchById } from "@/lib/supabase/matches";
import { getProfileById } from "@/lib/supabase/profiles";
import { getMyEntryForRoom, getRoomRivals } from "@/lib/supabase/entries";
import { getRoomMessages } from "@/lib/supabase/messages";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import { LiveBadge } from "@/components/live-badge";
import { SplitBar } from "@/components/split-bar";
import { Avatar } from "@/components/avatar";
import { JoinPanel } from "@/components/join-panel";
import { ChatComposer } from "@/components/chat-composer";
import { ShareButton } from "@/components/share-button";
import { RoomResult } from "@/components/room-result";
import { RoomLive } from "@/components/room-live";
import { AnimatedMoney } from "@/components/animated-money";
import { settleRoom } from "@/lib/settlement/settle";
import { explorerTxUrl } from "@/lib/wallet/constants";
import type { EntrySide } from "@/lib/types";

// The heart of the product. Per docs/masterplan/07-product-blueprint.md#45-room.
// Timeline events are rendered as system messages inline in chat rather than a
// separate list — one live feed reads more naturally than two. Pinned
// messages / moderation tooling are cut for V1 polish (see the "ruthless V1"
// case study in docs/masterplan/08-v1-scope.md) — Room Rules below covers
// the "what do I need to know" job pinned messages would otherwise do.
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
  const currentUser = await getCurrentProfile();
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
  const messages = await getRoomMessages(room.id);
  const rivals = await getRoomRivals(room.id);
  const sharePath = `/rooms/${room.id}${room.visibility === "private" ? `?code=${room.inviteCode}` : ""}`;
  const stakeLimitLabel =
    room.maxStakeCents === null ? "No limit" : `${formatMoney(room.minStakeCents)}–${formatMoney(room.maxStakeCents)}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      {/* Realtime: re-renders only when the room, its entries or the match change. */}
      {unfinished && <RoomLive roomId={room.id} matchId={room.matchId} kickoffAt={match.kickoffAt} />}
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
              <span>
                <AnimatedMoney cents={room.poolTotalCents} /> pool
              </span>
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
          {outcome ? (
            <div className="stagger-in" style={{ animationDelay: "30ms" }}>
              <RoomResult
                outcome={outcome}
                settled={settled}
                refunded={room.status === "refunded" || outcome === "void"}
                matchStillLive={match.status === "live"}
                entry={myEntry}
              />
            </div>
          ) : stakesClosed ? (
            <div
              className="stagger-in flex items-center gap-3 rounded-lg border border-border bg-surface p-4"
              style={{ animationDelay: "30ms" }}
            >
              <span aria-hidden className="text-rival-blue">
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
                  {myEntry
                    ? `You're in with ${formatMoney(myEntry.amountCents)} on ${myEntry.side.toUpperCase()}. `
                    : ""}
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
          ) : (
            <div className="stagger-in" style={{ animationDelay: "30ms" }}>
              <JoinPanel
                roomId={room.id}
                minStakeCents={room.minStakeCents}
                maxStakeCents={room.maxStakeCents}
                initialEntry={myEntry?.side ?? null}
                initialSide={preselect}
                returnPath={sharePath}
              />
            </div>
          )}

          {rivals.length > 0 && (
            <div className="stagger-in" style={{ animationDelay: "90ms" }}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Rivals</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {rivals.slice(0, 5).map((r) => (
                    <span
                      key={r.userId}
                      className="enter-pop rounded-full"
                      style={{ boxShadow: `0 0 0 2px ${r.side === "yes" ? "var(--rival-blue)" : "var(--rival-red)"}` }}
                    >
                      <Avatar name={r.displayName} size={28} imageUrl={r.avatarUrl} />
                    </span>
                  ))}
                </div>
                <span className="font-mono text-xs text-muted">
                  {room.participantCount} {room.participantCount === 1 ? "rival" : "rivals"}
                </span>
              </div>
            </div>
          )}

          <div
            className="stagger-in rounded-lg border border-border bg-surface p-4"
            style={{ animationDelay: "150ms" }}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Room rules</p>
            <dl className="mt-2.5 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Stakes</dt>
                <dd className="text-foreground">{stakeLimitLabel}</dd>
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
            <span className="flex items-center gap-2 text-sm text-muted">
              <ShareButton path={sharePath} label="room" />
              Share room
            </span>
            {room.visibility === "private" && (
              <span className="font-mono text-xs text-muted">Code {room.inviteCode}</span>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
