"use client";

import { useState } from "react";
import { leagueByCode } from "@/lib/mock-data";
import { joinLeague } from "@/lib/use-joined-leagues";
import { BottomSheet } from "./bottom-sheet";
import { PlusIcon } from "./icons";

// Same code-input-to-match shape as join-private-room-button.tsx, but
// joining a league doesn't navigate anywhere — it just adds you to the
// standings table you're already looking at, so the sheet simply closes
// and the list updates underneath it.
export function JoinLeagueButton() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setCode("");
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    const league = leagueByCode(trimmed);
    if (!league) {
      setError("No league found for that code — double-check and try again.");
      return;
    }
    joinLeague(league.id);
    close();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
        style={{ background: "var(--rival-blue-dim)", color: "var(--rival-blue)" }}
      >
        <PlusIcon />
        Join league
      </button>

      <BottomSheet open={open} onClose={close} title="Join a league">
        <p className="text-center text-sm text-muted">Enter the code a rival shared with you.</p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder="LEAGUE-XXXX"
            autoCapitalize="characters"
            className="w-full rounded-md border border-border bg-surface-elevated px-4 py-3 text-center font-mono text-base uppercase tracking-wider text-foreground placeholder:text-muted placeholder:normal-case focus:border-border-strong focus:outline-none"
            style={{ transition: "border-color 150ms ease" }}
          />
          {error && <p className="text-center text-sm text-danger-red">{error}</p>}
          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full rounded-md bg-foreground py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
          >
            Join league
          </button>
        </form>
      </BottomSheet>
    </>
  );
}
