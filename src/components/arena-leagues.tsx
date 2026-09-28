"use client";

import { withRef } from "@/lib/referral";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createLeague, fetchLeagueTable, fetchMyLeagues, joinLeague, leaveLeague, type League, type TableRow } from "@/lib/arena/data";
import { openAuthModal } from "@/lib/auth-modal-store";
import { useCurrentUser } from "./current-user-provider";
import { RivalCharacter } from "./rival-character";
import { BottomSheet } from "./bottom-sheet";
import { siteUrl } from "@/lib/site";

// Points only — no entry fee, no prize, ever (money would make it a
// Tournament, which V1 leaves out). A win is 3 points; beating the room
// (your side held under 40% of the pot) adds 1. Everyone is in the Global
// league; private leagues are joined by code and invisible to anyone
// without it. All of it computed from settled rooms in the database.
export function ArenaLeagues() {
  const me = useCurrentUser();
  const [leagues, setLeagues] = useState<League[] | null>(null);
  const [sheet, setSheet] = useState<"create" | "join" | null>(null);
  const [justMade, setJustMade] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!me) return;
    void fetchMyLeagues().then(setLeagues);
  }, [me]);

  useEffect(reload, [reload]);

  function open(kind: "create" | "join") {
    if (!me) {
      openAuthModal({ next: "/arena" });
      return;
    }
    setSheet(kind);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label font-semibold text-secondary">Your leagues</p>
        <div className="flex gap-2">
          <button onClick={() => open("join")} className="h-8 rounded-full px-4 text-body text-foreground edge">
            Join with code
          </button>
          <button onClick={() => open("create")} className="h-8 rounded-full px-4 text-body font-bold text-white" style={{ background: "var(--yes)" }}>
            New league
          </button>
        </div>
      </div>

      {me && leagues !== null && leagues.length === 0 && (
        <div className="rounded-card px-6 py-8 text-center edge">
          <p className="font-display text-body-lg font-bold text-foreground">Start a league with your people</p>
          <p className="mx-auto mt-1 max-w-sm text-body text-secondary">Make one, share the code in the group chat, and every room you all settle counts toward the table.</p>
        </div>
      )}

      {leagues?.map((l) => (
        <LeagueTable
          key={l.id}
          league={l}
          highlight={justMade === l.id}
          onLeft={() => {
            setLeagues((cur) => cur?.filter((x) => x.id !== l.id) ?? null);
          }}
        />
      ))}

      <LeagueTable league={null} />

      <LeagueSheet
        kind={sheet}
        onClose={() => setSheet(null)}
        onDone={(id) => {
          setSheet(null);
          setJustMade(id);
          reload();
        }}
      />
    </div>
  );
}

function LeagueTable({ league, highlight = false, onLeft }: { league: League | null; highlight?: boolean; onLeft?: () => void }) {
  const me = useCurrentUser();
  const [rows, setRows] = useState<TableRow[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    void fetchLeagueTable(league?.id ?? null)
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [league?.id]);

  async function share() {
    if (!league) return;
    const text = `Join my Rivaly league "${league.name}" — code ${league.code}`;
    try {
      if (navigator.share) await navigator.share({ text, url: withRef(siteUrl("/arena")) });
      else {
        await navigator.clipboard.writeText(league.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  }

  return (
    <section className={highlight ? "[animation:fade-in-up_240ms_ease-out_both]" : undefined}>
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-body font-semibold text-foreground">{league ? league.name : "Global"}</p>
        {league ? (
          <>
            <button onClick={share} className="font-mono text-caption text-secondary hover:text-foreground" aria-label="Share league code">
              {copied ? "Copied" : `Code ${league.code}`}
            </button>
            <button
              onClick={async () => {
                if (me && (await leaveLeague(league.id, me.id))) onLeft?.();
              }}
              className="text-caption text-secondary transition-colors hover:text-no-ink"
            >
              Leave
            </button>
          </>
        ) : (
          <span className="text-caption text-secondary">Everyone with a settled room</span>
        )}
      </div>
      <div className="mt-3 flex flex-col divide-y divide-line rounded-card bg-surface edge">
        {rows === null && <div className="h-24 skeleton" />}
        {rows?.length === 0 && (
          <p className="px-4 py-6 text-center text-body text-secondary">
            {league ? "No one here yet." : "The table fills in when the first rooms settle."}
          </p>
        )}
        {rows?.map((s, i) => {
          const self = s.userId === me?.id;
          return (
            <Link
              key={s.userId}
              href={s.username ? `/profile/${s.username}` : "#"}
              className="flex items-center gap-3 px-4 py-3"
              style={self ? { background: "var(--surface-elevated)" } : undefined}
            >
              <span className="w-5 shrink-0 tabular-nums text-caption text-secondary">{i + 1}</span>
              <RivalCharacter name={s.name} imageUrl={s.avatar} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body text-foreground">
                  {s.name}
                  {self && <span className="text-secondary"> (you)</span>}
                </p>
                <p className="tabular-nums text-caption text-secondary">
                  {s.wins}W · {s.played} played
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular-nums text-body font-medium text-foreground">{s.points} pts</p>
                {s.gameweekPoints > 0 && <p className="tabular-nums text-caption text-money-ink">+{s.gameweekPoints} this GW</p>}
              </div>
            </Link>
          );
        })}
      </div>
      {league && <p className="mt-2 text-caption text-secondary">{league.members} {league.members === 1 ? "member" : "members"} · win 3 pts · beat the room +1</p>}
    </section>
  );
}

function LeagueSheet({ kind, onClose, onDone }: { kind: "create" | "join" | null; onClose: () => void; onDone: (id: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ id: string; name: string; code: string } | null>(null);

  function close() {
    setValue("");
    setError(null);
    setMade(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = kind === "create" ? await createLeague(value.trim()) : await joinLeague(value.trim());
    setBusy(false);
    if (res.error || !res.league) {
      setError(res.error ?? "Something went wrong.");
      return;
    }
    if (kind === "create") setMade(res.league);
    else {
      setValue("");
      onDone(res.league.id);
    }
  }

  return (
    <BottomSheet open={kind !== null} onClose={close} title={made ? "League made" : kind === "create" ? "New league" : "Join a league"}>
      {made ? (
        <div className="mt-4 text-center">
          <p className="text-body text-secondary">Share this code — anyone with it can join {made.name}.</p>
          <p className="mt-3 font-mono text-3xl font-black text-foreground">{made.code}</p>
          <button
            onClick={() => {
              const id = made.id;
              setValue("");
              setMade(null);
              onDone(id);
            }}
            className="mt-5 h-11 w-full rounded-full text-body font-bold text-white"
            style={{ background: "var(--yes)" }}
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <input
            value={value}
            onChange={(e) => setValue(kind === "join" ? e.target.value.toUpperCase() : e.target.value)}
            placeholder={kind === "create" ? "League name — e.g. Office Five-a-side" : "6-character code"}
            maxLength={kind === "create" ? 40 : 6}
            autoFocus
            className="h-12 rounded-card bg-background px-4 text-body-lg text-foreground edge placeholder:text-secondary focus:outline-none focus:ring-yes"
            style={kind === "join" ? { fontFamily: "var(--tabular-nums, monospace)", letterSpacing: "0.2em" } : undefined}
          />
          {error && <p className="text-body font-semibold text-no-ink">{error}</p>}
          <button type="submit" disabled={!value.trim() || busy} className="h-11 rounded-full text-body font-bold text-white disabled:opacity-40" style={{ background: "var(--yes)" }}>
            {busy ? "…" : kind === "create" ? "Create league" : "Join"}
          </button>
        </form>
      )}
    </BottomSheet>
  );
}
