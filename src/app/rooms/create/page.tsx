"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { matches, formatMoney } from "@/lib/mock-data";
import { SplitBar } from "@/components/split-bar";
import { useCurrentUser } from "@/components/current-user-provider";
import { createRoom } from "@/app/rooms/actions";

// Fields per docs/masterplan/07-product-blueprint.md#46-create-room. Framed
// as expressing an opinion, not filling a financial form — see
// docs/masterplan/06-emotion-design.md#1-creating-a-room ("Throw Down the
// Challenge," not "Create Room"). Match selection stays the mock fixture
// list (real fixture data is a separate, later effort — see
// supabase/migrations/20260902190749_rooms.sql's comment on rooms.match_id)
// but the room itself is now a real Supabase insert via createRoom().
const creatable = matches.filter((m) => m.status !== "finished");
const amounts = [500_00, 1_000_00, 2_000_00, 5_000_00, 10_000_00];

export default function CreateRoomPage() {
  const currentUser = useCurrentUser();
  const [matchId, setMatchId] = useState<string | null>(null);
  const [prediction, setPrediction] = useState("");
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [result, setResult] = useState<{ roomId: string; inviteCode: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const match = matches.find((m) => m.id === matchId);
  const ready = Boolean(match && prediction.trim() && amountCents);

  function submit() {
    if (!ready || !match || !amountCents) return;
    setError(null);
    startTransition(async () => {
      const res = await createRoom({
        matchId: match.id,
        prediction,
        entryAmountCents: amountCents,
        visibility,
      });
      if (res.ok) {
        setResult({ roomId: res.roomId, inviteCode: res.inviteCode });
      } else {
        setError(res.error);
      }
    });
  }

  if (result) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center md:px-6">
        <p className="font-mono text-[11px] uppercase tracking-wider text-rival-blue">
          Challenge sent
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
          &ldquo;{prediction}&rdquo;
        </h1>
        <p className="mt-3 text-sm text-muted">
          Your room is live. Share it — a room without opponents isn&rsquo;t a room.
        </p>

        <div className="mt-8 flex items-center justify-center gap-2">
          <code className="rounded-md border border-border bg-surface px-4 py-2.5 font-mono text-sm text-foreground">
            {result.inviteCode}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.inviteCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium text-foreground transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>

        <Link
          href={`/rooms/${result.roomId}`}
          className="mt-8 inline-block rounded-md bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          Go to room →
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">New room</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
        What do you believe?
      </h1>
      <p className="mt-2 text-sm text-muted">Who&rsquo;s taking the other side?</p>

      {!currentUser && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          <Link href="/login?next=/rooms/create" className="hover-link text-foreground transition-colors">
            Sign in
          </Link>{" "}
          to create a room.
        </div>
      )}

      <div className="mt-9 flex flex-col gap-8">
        {/* Match */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Match</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {creatable.map((m) => (
              <button
                key={m.id}
                onClick={() => setMatchId(m.id)}
                className="rounded-md border px-3.5 py-2 text-sm transition-transform duration-150 ease-out active:scale-[0.97]"
                style={{
                  borderColor: matchId === m.id ? "var(--rival-blue)" : "var(--border)",
                  color: matchId === m.id ? "var(--rival-blue)" : "var(--foreground)",
                  background: matchId === m.id ? "var(--rival-blue-dim)" : "transparent",
                }}
              >
                {m.homeTeam} v {m.awayTeam}
              </button>
            ))}
          </div>
        </div>

        {/* Prediction */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Your prediction</p>
          <input
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder={match ? `${match.homeTeam} scores 3+ tonight` : "Arsenal scores 3+ tonight"}
            className="mt-2.5 w-full border-b border-border bg-transparent pb-2.5 font-display text-2xl font-semibold text-foreground placeholder:text-muted/50 focus:border-foreground focus:outline-none"
            style={{ transition: "border-color 150ms ease" }}
          />
        </div>

        {/* Entry amount */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Entry amount</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {amounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmountCents(a)}
                className="rounded-md border px-3.5 py-2 font-mono text-sm transition-transform duration-150 ease-out active:scale-[0.97]"
                style={{
                  borderColor: amountCents === a ? "var(--rival-blue)" : "var(--border)",
                  color: amountCents === a ? "var(--rival-blue)" : "var(--foreground)",
                  background: amountCents === a ? "var(--rival-blue-dim)" : "transparent",
                }}
              >
                {formatMoney(a)}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Visibility</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {(["public", "private"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVisibility(v)}
                className="rounded-md border py-2.5 text-sm capitalize transition-transform duration-150 ease-out active:scale-[0.97]"
                style={{
                  borderColor: visibility === v ? "var(--border-strong)" : "var(--border)",
                  color: "var(--foreground)",
                  background: visibility === v ? "var(--surface-elevated)" : "transparent",
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Live preview */}
        {ready && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Preview</p>
            <div className="mt-2.5 rounded-lg border border-border bg-surface p-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                {match!.competition}
              </p>
              <p className="mt-2 text-lg font-medium text-foreground">{prediction}</p>
              <div className="mt-3">
                <SplitBar leftPct={50} leftLabel="Yes" rightLabel="No" />
              </div>
              <p className="mt-3 font-mono text-xs text-muted">
                Resolves via official match result when this match ends.
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-danger-red">{error}</p>}

        <button
          onClick={submit}
          disabled={!ready || !currentUser || pending}
          className="rounded-md bg-foreground py-3.5 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          {pending ? "Creating…" : "Throw down the challenge →"}
        </button>
      </div>
    </main>
  );
}
