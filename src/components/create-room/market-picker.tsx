"use client";

import { useState } from "react";
import type { CreateRoomMarket } from "@/lib/markets";
import { composeMarket } from "@/lib/markets";
import { playersFor } from "@/lib/squads";
import type { EntrySide, Match } from "@/lib/types";
import { Accordion, OptionCell, OverUnderGrid, ScoreStepper, Segmented } from "./controls";

/**
 * What the creator tapped: the canonical market (whose "Yes" settlement
 * understands) plus which side of it they're on. Yes/No markets store a "No"
 * tap as the positive claim with side "no" — "no red card" is "A red card is
 * shown", backed on No — so the bet step can pre-select their side instead of
 * asking twice.
 */
export interface Pick {
  key: string;
  market: CreateRoomMarket;
  side: EntrySide;
}

export type Score = { home: number; away: number };

type Tab = "main" | "score" | "halves" | "extras";

const TABS: { id: Tab; label: string }[] = [
  { id: "main", label: "Main" },
  { id: "score", label: "Exact score" },
  { id: "halves", label: "Halves" },
  { id: "extras", label: "Corners & cards" },
];

// Lines people actually argue about for each stat — no odds, just the line.
const GOALS_LINES = [2.5, 3.5, 4.5, 5.5, 6.5];
const HALF_LINES = [0.5, 1.5, 2.5, 3.5];
const CORNER_LINES = [7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

function tabFor(pick: Pick | null): Tab {
  switch (pick?.market.type) {
    case "correct_score":
      return "score";
    case "halftime_correct_score":
    case "halftime_total_goals":
    case "second_half_total_goals":
      return "halves";
    case "corners":
    case "red_card":
      return "extras";
    default:
      return "main";
  }
}

/** Short label for the current pick — what the creator would say out loud. */
export function pickLabel(pick: Pick, match: Match): string {
  const m = pick.market;
  if (m.type === "both_score") return pick.side === "yes" ? "Both teams score" : "Not both teams score";
  if (m.type === "red_card") return pick.side === "yes" ? "A red card is shown" : "No red card";
  return composeMarket(m, match).prediction;
}

export function MarketPicker({
  match,
  pick,
  onPick,
  fullTime,
  setFullTime,
  halfTime,
  setHalfTime,
}: {
  match: Match;
  pick: Pick | null;
  onPick: (pick: Pick) => void;
  fullTime: Score;
  setFullTime: (s: Score) => void;
  halfTime: Score;
  setHalfTime: (s: Score) => void;
}) {
  const [tab, setTab] = useState<Tab>(() => tabFor(pick));
  const pickTab = pick ? tabFor(pick) : null;
  const sel = (key: string) => pick?.key === key;

  // Per-group summary shown on a collapsed accordion, so a remembered pick is
  // never hidden behind a closed section.
  const summaryFor = (prefix: string) => (pick && pick.key.startsWith(prefix) ? pickLabel(pick, match) : null);

  return (
    <div>
      <div role="tablist" aria-label="Market groups" className="no-scrollbar -mx-4 flex gap-6 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className="relative flex shrink-0 items-center gap-1.5 py-3 text-[15px] font-semibold transition-colors duration-150"
              style={{ color: active ? "var(--foreground)" : "var(--muted)" }}
            >
              {t.label}
              {pickTab === t.id && (
                <span aria-label="has your pick" className="h-1.5 w-1.5 rounded-full bg-rival-blue" />
              )}
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-px h-0.5 origin-center rounded-full bg-foreground transition-transform duration-200 ease-out"
                style={{ transform: active ? "scaleX(1)" : "scaleX(0)" }}
              />
            </button>
          );
        })}
      </div>

      <div key={tab} role="tabpanel" className="enter-row mt-1">
        {tab === "main" && (
          <>
            <Accordion title="Team result" summary={summaryFor("winner:")}>
              <div className="grid grid-cols-3 gap-2">
                {(["home", "draw", "away"] as const).map((o) => (
                  <OptionCell
                    key={o}
                    selected={sel(`winner:${o}`)}
                    onClick={() => onPick({ key: `winner:${o}`, market: { type: "winner", outcome: o }, side: "yes" })}
                  >
                    <span className="line-clamp-2 py-1.5 text-center leading-tight">{o === "home" ? match.homeTeam : o === "away" ? match.awayTeam : "Draw"}</span>
                  </OptionCell>
                ))}
              </div>
            </Accordion>

            <Accordion title="Goals over/under" summary={summaryFor("goals:")}>
              <OverUnderGrid
                lines={GOALS_LINES}
                unit="goals"
                isSelected={(c, l) => sel(`goals:${c}:${l}`)}
                onPick={(c, l) =>
                  onPick({ key: `goals:${c}:${l}`, market: { type: "total_goals", comparison: c, line: l }, side: "yes" })
                }
              />
            </Accordion>

            <Accordion title="Both teams to score" summary={summaryFor("btts:")}>
              <YesNoRow
                selected={pick?.key.startsWith("btts:") ? pick.side : null}
                onPick={(side) => onPick({ key: `btts:${side}`, market: { type: "both_score" }, side })}
              />
            </Accordion>

            <Accordion title="Anytime goalscorer" summary={summaryFor("scorer:")} defaultOpen={pick?.key.startsWith("scorer:") ?? false}>
              <ScorerPicker match={match} pick={pick} onPick={onPick} />
            </Accordion>
          </>
        )}

        {tab === "score" && (
          <div className="flex flex-col gap-3 py-4">
            <p className="text-sm text-muted">Call the full-time score.</p>
            <ScoreStepper
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              home={fullTime.home}
              away={fullTime.away}
              onChange={(home, away) => setFullTime({ home, away })}
            />
            <ConfirmScore
              label={`Call ${fullTime.home}–${fullTime.away}`}
              selected={pick?.market.type === "correct_score" && pick.market.homeGoals === fullTime.home && pick.market.awayGoals === fullTime.away}
              onClick={() =>
                onPick({
                  key: `cs:${fullTime.home}-${fullTime.away}`,
                  market: { type: "correct_score", homeGoals: fullTime.home, awayGoals: fullTime.away },
                  side: "yes",
                })
              }
            />
          </div>
        )}

        {tab === "halves" && (
          <>
            <Accordion title="Half-time score" summary={summaryFor("htcs:")}>
              <div className="flex flex-col gap-3">
                <ScoreStepper
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                  home={halfTime.home}
                  away={halfTime.away}
                  onChange={(home, away) => setHalfTime({ home, away })}
                />
                <ConfirmScore
                  label={`Call ${halfTime.home}–${halfTime.away} at the break`}
                  selected={
                    pick?.market.type === "halftime_correct_score" &&
                    pick.market.homeGoals === halfTime.home &&
                    pick.market.awayGoals === halfTime.away
                  }
                  onClick={() =>
                    onPick({
                      key: `htcs:${halfTime.home}-${halfTime.away}`,
                      market: { type: "halftime_correct_score", homeGoals: halfTime.home, awayGoals: halfTime.away },
                      side: "yes",
                    })
                  }
                />
              </div>
            </Accordion>

            <Accordion title="First-half goals" summary={summaryFor("h1:")}>
              <OverUnderGrid
                lines={HALF_LINES}
                unit="first-half goals"
                isSelected={(c, l) => sel(`h1:${c}:${l}`)}
                onPick={(c, l) =>
                  onPick({ key: `h1:${c}:${l}`, market: { type: "halftime_total_goals", comparison: c, line: l }, side: "yes" })
                }
              />
            </Accordion>

            <Accordion title="Second-half goals" summary={summaryFor("h2:")}>
              <OverUnderGrid
                lines={HALF_LINES}
                unit="second-half goals"
                isSelected={(c, l) => sel(`h2:${c}:${l}`)}
                onPick={(c, l) =>
                  onPick({ key: `h2:${c}:${l}`, market: { type: "second_half_total_goals", comparison: c, line: l }, side: "yes" })
                }
              />
            </Accordion>
          </>
        )}

        {tab === "extras" && (
          <>
            <Accordion title="Corners over/under" summary={summaryFor("corners:")}>
              <OverUnderGrid
                lines={CORNER_LINES}
                unit="corners"
                isSelected={(c, l) => sel(`corners:${c}:${l}`)}
                onPick={(c, l) =>
                  onPick({ key: `corners:${c}:${l}`, market: { type: "corners", comparison: c, line: l }, side: "yes" })
                }
              />
            </Accordion>

            <Accordion title="Red card shown" summary={summaryFor("red:")}>
              <YesNoRow
                selected={pick?.key.startsWith("red:") ? pick.side : null}
                onPick={(side) => onPick({ key: `red:${side}`, market: { type: "red_card" }, side })}
              />
            </Accordion>
          </>
        )}
      </div>
    </div>
  );
}

function YesNoRow({ selected, onPick }: { selected: EntrySide | null; onPick: (side: EntrySide) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <OptionCell selected={selected === "yes"} onClick={() => onPick("yes")}>
        Yes
      </OptionCell>
      <OptionCell selected={selected === "no"} onClick={() => onPick("no")}>
        No
      </OptionCell>
    </div>
  );
}

function ConfirmScore({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-12 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-transform duration-150 ease-out active:scale-[0.98]"
    >
      {selected ? `${label} ✓` : `${label} →`}
    </button>
  );
}

function ScorerPicker({ match, pick, onPick }: { match: Match; pick: Pick | null; onPick: (pick: Pick) => void }) {
  const initialTeam = pick?.market.type === "anytime_scorer" ? pick.market.team : "home";
  const [team, setTeam] = useState<"home" | "away">(initialTeam);
  const [custom, setCustom] = useState("");
  const teamName = team === "home" ? match.homeTeam : match.awayTeam;
  const players = playersFor(teamName);

  const choose = (player: string) =>
    onPick({ key: `scorer:${team}:${player}`, market: { type: "anytime_scorer", player, team }, side: "yes" });

  const customName = custom.trim();

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        label="Team"
        value={team}
        onChange={setTeam}
        options={[
          { value: "home", label: match.homeTeam },
          { value: "away", label: match.awayTeam },
        ]}
      />
      {players.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {players.map((p) => (
            <OptionCell key={p} selected={pick?.key === `scorer:${team}:${p}`} onClick={() => choose(p)} className="!justify-start">
              {p}
            </OptionCell>
          ))}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (customName.length >= 2) choose(customName);
        }}
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={60}
          placeholder={players.length > 0 ? "Someone else…" : `Type a ${teamName} player…`}
          className="min-h-12 min-w-0 flex-1 rounded-md border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted focus:border-border-strong focus:outline-none"
          style={{ transition: "border-color 150ms ease" }}
        />
        <button
          type="submit"
          disabled={customName.length < 2}
          className="min-h-12 shrink-0 rounded-md border border-border-strong px-4 text-sm font-medium text-foreground transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-40"
        >
          Pick
        </button>
      </form>
    </div>
  );
}
