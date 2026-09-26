"use client";

import Link from "next/link";
import { BottomSheet } from "@/components/bottom-sheet";
import { formatMoney } from "@/lib/mock-data";
import { decidedBy, momentHeadline, type MatchRoom, type MomentItem } from "@/lib/arena/model";

const SIDE: Record<string, string> = { yes: "var(--rival-blue)", no: "var(--rival-red)" };
const STATUS: Record<string, string> = { open: "Open", live: "Live", settled: "Settled", cancelled: "Cancelled" };

/** Every public room on a moment's match — straight in, with what this moment just decided. */
export function ArenaMatchRooms({ moment, rooms, onClose }: { moment: MomentItem | null; rooms: MatchRoom[]; onClose: () => void }) {
  const decided = new Map(moment ? decidedBy(moment, rooms).map((d) => [d.room.id, d.outcome]) : []);
  const title = moment ? `${moment.match.home} v ${moment.match.away}` : "";
  const canStart = moment && moment.match.status === "scheduled";
  return (
    <BottomSheet open={moment !== null} onClose={onClose} title={title}>
      {moment && (
        <div className="mt-3">
          <p className="text-center text-[13px] text-muted">
            {momentHeadline(moment).title}
            {moment.payload.home !== undefined ? ` · ${moment.payload.home}–${moment.payload.away}` : ""}
          </p>
          <div className="mt-4 flex max-h-[55vh] flex-col divide-y divide-border overflow-y-auto rounded-2xl ring-1 ring-border">
            {rooms.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No rooms on this match yet.</p>}
            {rooms.map((r) => {
              const d = decided.get(r.id);
              const done = r.status === "settled" && r.outcome;
              return (
                <Link key={r.id} href={`/rooms/${r.id}`} onClick={onClose} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">{r.prediction}</p>
                    <p className="font-mono text-[11px] text-muted">
                      {STATUS[r.status] ?? r.status} · {formatMoney(r.pool)} pot · {r.participants} in
                    </p>
                  </div>
                  {d ? (
                    <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase" style={{ color: SIDE[d], boxShadow: `inset 0 0 0 1px ${SIDE[d]}` }}>
                      {d} · decided here
                    </span>
                  ) : done ? (
                    <span className="shrink-0 text-[11px] font-bold uppercase" style={{ color: SIDE[r.outcome!] ?? "var(--muted)" }}>
                      {r.outcome} won
                    </span>
                  ) : (
                    <span className="shrink-0 text-muted" aria-hidden>
                      ›
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          {canStart && (
            <Link href={`/rooms/create?matchId=${moment.match.id}`} onClick={onClose} className="mt-4 flex h-11 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: "var(--rival-blue)" }}>
              Start a room on this match
            </Link>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
