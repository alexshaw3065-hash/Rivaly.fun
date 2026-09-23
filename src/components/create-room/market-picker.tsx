"use client";

import { useState, type ReactNode } from "react";
import { composeMarket, sportOf, type CreateRoomMarket, type Sport } from "@/lib/markets";
import { playersFor } from "@/lib/squads";
import type { EntrySide, Match } from "@/lib/types";
import { TeamCrest } from "../team-crest";
import { Accordion, OptionCell, OverUnderGrid, ScoreStepper, Segmented } from "./controls";
import {
  BootIcon,
  BothScoreIcon,
  CornerFlagIcon,
  GoalIcon,
  GoalpostIcon,
  GridironIcon,
  HalfClockIcon,
  MarginIcon,
  OvertimeIcon,
  RefCardIcon,
  ScoreboardIcon,
  TrophyIcon,
} from "./market-icons";

/**
 * What the creator tapped: the canonical market (whose "Yes" settlement
 * understands) plus which side of it they're on. Yes/No markets store a "No"
 * tap as the positive claim with side "no" — "no red card" is "A red card is
 * shown", backed on No — so the stake step can pre-select their side instead
 * of asking twice.
 */
export interface Pick {
  key: string;
  market: CreateRoomMarket;
  side: EntrySide;
}

export type Score = { home: number; away: number };

type Tab = { id: string; label: string; icon: ReactNode };

const TABS: Record<Sport, Tab[]> = {
  soccer: [
    { id: "main", label: "Main", icon: <TrophyIcon /> },
    { id: "score", label: "Exact score", icon: <ScoreboardIcon /> },
    { id: "halves", label: "Halves", icon: <HalfClockIcon /> },
    { id: "extras", label: "Corners & cards", icon: <CornerFlagIcon /> },
  ],
  nfl: [
    { id: "main", label: "Main", icon: <TrophyIcon /> },
    { id: "teams", label: "Team totals", icon: <ScoreboardIcon /> },
    { id: "halves", label: "Halves", icon: <HalfClockIcon /> },
    { id: "scoring", label: "Scoring", icon: <GridironIcon /> },
  ],
};

// Lines people actually argue about for each stat — no odds, just the line.
const LINES = {
  goals: [2.5, 3.5, 4.5, 5.5, 6.5],
  half: [0.5, 1.5, 2.5, 3.5],
  corners: [7.5, 8.5, 9.5, 10.5, 11.5, 12.5],
  nflTotal: [37.5, 40.5, 43.5, 46.5, 49.5, 52.5],
  nflTeam: [17.5, 20.5, 23.5, 27.5, 30.5],
  nflHalf: [17.5, 20.5, 23.5, 26.5],
  nflMargin: [3.5, 6.5, 7.5, 10.5, 13.5],
  touchdowns: [3.5, 4.5, 5.5, 6.5],
  fieldGoals: [2.5, 3.5, 4.5],
};

function tabFor(pick: Pick | null, sport: Sport): string {
  const t = pick?.market.type;
  if (sport === "nfl") {
    if (t === "team_points") return "teams";
    if (t === "halftime_result" || t === "first_half_points") return "halves";
    if (t === "total_touchdowns" || t === "total_field_goals" || t === "overtime") return "scoring";
    return "main";
  }
  if (t === "correct_score") return "score";
  if (t === "halftime_correct_score" || t === "halftime_total_goals" || t === "second_half_total_goals") return "halves";
  if (t === "corners" || t === "red_card") return "extras";
  return "main";
}

/** Short label for the current pick — what the creator would say out loud. */
export function pickLabel(pick: Pick, match: Match): string {
  const m = pick.market;
  if (m.type === "both_score") return pick.side === "yes" ? "Both teams score" : "Not both teams score";
  if (m.type === "red_card") return pick.side === "yes" ? "A red card is shown" : "No red card";
  if (m.type === "overtime") return pick.side === "yes" ? "Goes to overtime" : "No overtime";
  return composeMarket(m, match).prediction;
}

interface PickerProps {
  match: Match;
  pick: Pick | null;
  onPick: (pick: Pick) => void;
  fullTime: Score;
  setFullTime: (s: Score) => void;
  halfTime: Score;
  setHalfTime: (s: Score) => void;
}

export function MarketPicker(props: PickerProps) {
  const { match, pick } = props;
  const sport = sportOf(match);
  const tabs = TABS[sport];
  const [tab, setTab] = useState(() => tabFor(pick, sport));
  const pickTab = pick ? tabFor(pick, sport) : null;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Market groups"
        className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
      >
        {tabs.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className="relative flex min-h-12 shrink-0 items-center gap-1.5 text-[15px] font-semibold transition-colors duration-150"
              style={{ color: active ? "var(--foreground)" : "var(--muted)" }}
            >
              <span style={{ color: active ? "var(--rival-blue)" : "currentColor" }}>{t.icon}</span>
              {t.label}
              {pickTab === t.id && <span aria-label="has your pick" className="h-1.5 w-1.5 rounded-full bg-rival-blue" />}
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-px h-0.5 origin-center rounded-full bg-rival-blue transition-transform duration-200 ease-out"
                style={{ transform: active ? "scaleX(1)" : "scaleX(0)" }}
              />
            </button>
          );
        })}
      </div>

      <div key={tab} role="tabpanel" className="enter-row mt-1">
        {sport === "nfl" ? <NflPanel tab={tab} {...props} /> : <SoccerPanel tab={tab} {...props} />}
      </div>
    </div>
  );
}

function pickHelpers(pick: Pick | null, match: Match) {
  return {
    sel: (key: string) => pick?.key === key,
    summaryFor: (prefix: string) => (pick && pick.key.startsWith(prefix) ? pickLabel(pick, match) : null),
    sideFor: (prefix: string) => (pick?.key.startsWith(prefix) ? pick.side : null),
  };
}

type OuType =
  | "total_goals"
  | "halftime_total_goals"
  | "second_half_total_goals"
  | "corners"
  | "total_points"
  | "first_half_points"
  | "total_touchdowns"
  | "total_field_goals";

function ouPicker(onPick: (p: Pick) => void, prefix: string, type: OuType) {
  return (c: "over" | "under", l: number) =>
    onPick({ key: `${prefix}:${c}:${l}`, market: { type, comparison: c, line: l }, side: "yes" });
}

function SoccerPanel({ tab, match, pick, onPick, fullTime, setFullTime, halfTime, setHalfTime }: PickerProps & { tab: string }) {
  const { sel, summaryFor, sideFor } = pickHelpers(pick, match);

  if (tab === "score") {
    const key = `cs:${fullTime.home}-${fullTime.away}`;
    return (
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
          selected={pick?.key === key}
          onClick={() =>
            onPick({ key, market: { type: "correct_score", homeGoals: fullTime.home, awayGoals: fullTime.away }, side: "yes" })
          }
        />
      </div>
    );
  }

  if (tab === "halves") {
    const key = `htcs:${halfTime.home}-${halfTime.away}`;
    return (
      <>
        <Accordion title="Half-time score" icon={<ScoreboardIcon />} summary={summaryFor("htcs:")}>
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
              selected={pick?.key === key}
              onClick={() =>
                onPick({
                  key,
                  market: { type: "halftime_correct_score", homeGoals: halfTime.home, awayGoals: halfTime.away },
                  side: "yes",
                })
              }
            />
          </div>
        </Accordion>
        <Accordion title="First-half goals" icon={<HalfClockIcon />} summary={summaryFor("h1:")}>
          <OverUnderGrid lines={LINES.half} unit="first-half goals" isSelected={(c, l) => sel(`h1:${c}:${l}`)} onPick={ouPicker(onPick, "h1", "halftime_total_goals")} />
        </Accordion>
        <Accordion title="Second-half goals" icon={<HalfClockIcon />} summary={summaryFor("h2:")}>
          <OverUnderGrid lines={LINES.half} unit="second-half goals" isSelected={(c, l) => sel(`h2:${c}:${l}`)} onPick={ouPicker(onPick, "h2", "second_half_total_goals")} />
        </Accordion>
      </>
    );
  }

  if (tab === "extras") {
    return (
      <>
        <Accordion title="Corners over/under" icon={<CornerFlagIcon />} summary={summaryFor("corners:")}>
          <OverUnderGrid lines={LINES.corners} unit="corners" isSelected={(c, l) => sel(`corners:${c}:${l}`)} onPick={ouPicker(onPick, "corners", "corners")} />
        </Accordion>
        <Accordion title="Red card shown" icon={<RefCardIcon />} summary={summaryFor("red:")}>
          <YesNoRow selected={sideFor("red:")} onPick={(side) => onPick({ key: `red:${side}`, market: { type: "red_card" }, side })} />
        </Accordion>
      </>
    );
  }

  return (
    <>
      <Accordion title="Team result" icon={<TrophyIcon />} summary={summaryFor("winner:")}>
        <TeamResultRow
          match={match}
          withDraw
          isSelected={(o) => sel(`winner:${o}`)}
          onPick={(o) => onPick({ key: `winner:${o}`, market: { type: "winner", outcome: o }, side: "yes" })}
        />
      </Accordion>
      <Accordion title="Goals over/under" icon={<GoalIcon />} summary={summaryFor("goals:")}>
        <OverUnderGrid lines={LINES.goals} unit="goals" isSelected={(c, l) => sel(`goals:${c}:${l}`)} onPick={ouPicker(onPick, "goals", "total_goals")} />
      </Accordion>
      <Accordion title="Both teams to score" icon={<BothScoreIcon />} summary={summaryFor("btts:")}>
        <YesNoRow selected={sideFor("btts:")} onPick={(side) => onPick({ key: `btts:${side}`, market: { type: "both_score" }, side })} />
      </Accordion>
      <Accordion
        title="Anytime goalscorer"
        icon={<BootIcon />}
        summary={summaryFor("scorer:")}
        defaultOpen={pick?.key.startsWith("scorer:") ?? false}
      >
        <ScorerPicker match={match} pick={pick} onPick={onPick} />
      </Accordion>
    </>
  );
}

function NflPanel({ tab, match, pick, onPick }: PickerProps & { tab: string }) {
  const { sel, summaryFor, sideFor } = pickHelpers(pick, match);

  if (tab === "teams") return <TeamTotals match={match} pick={pick} onPick={onPick} />;

  if (tab === "halves") {
    return (
      <>
        <Accordion title="Half-time leader" icon={<HalfClockIcon />} summary={summaryFor("htr:")}>
          <TeamResultRow
            match={match}
            withDraw
            drawLabel="Tied"
            isSelected={(o) => sel(`htr:${o}`)}
            onPick={(o) => onPick({ key: `htr:${o}`, market: { type: "halftime_result", outcome: o }, side: "yes" })}
          />
        </Accordion>
        <Accordion title="First-half points" icon={<ScoreboardIcon />} summary={summaryFor("h1p:")}>
          <OverUnderGrid lines={LINES.nflHalf} unit="first-half points" isSelected={(c, l) => sel(`h1p:${c}:${l}`)} onPick={ouPicker(onPick, "h1p", "first_half_points")} />
        </Accordion>
      </>
    );
  }

  if (tab === "scoring") {
    return (
      <>
        <Accordion title="Total touchdowns" icon={<GridironIcon />} summary={summaryFor("td:")}>
          <OverUnderGrid lines={LINES.touchdowns} unit="touchdowns" isSelected={(c, l) => sel(`td:${c}:${l}`)} onPick={ouPicker(onPick, "td", "total_touchdowns")} />
        </Accordion>
        <Accordion title="Total field goals" icon={<GoalpostIcon />} summary={summaryFor("fg:")}>
          <OverUnderGrid lines={LINES.fieldGoals} unit="field goals" isSelected={(c, l) => sel(`fg:${c}:${l}`)} onPick={ouPicker(onPick, "fg", "total_field_goals")} />
        </Accordion>
        <Accordion title="Goes to overtime" icon={<OvertimeIcon />} summary={summaryFor("ot:")}>
          <YesNoRow selected={sideFor("ot:")} onPick={(side) => onPick({ key: `ot:${side}`, market: { type: "overtime" }, side })} />
        </Accordion>
      </>
    );
  }

  return (
    <>
      <Accordion title="Winner" icon={<TrophyIcon />} summary={summaryFor("winner:")}>
        <TeamResultRow
          match={match}
          isSelected={(o) => sel(`winner:${o}`)}
          onPick={(o) => onPick({ key: `winner:${o}`, market: { type: "winner", outcome: o }, side: "yes" })}
        />
      </Accordion>
      <Accordion title="Winning margin" icon={<MarginIcon />} summary={summaryFor("margin:")}>
        <div className="grid grid-cols-2 gap-2">
          {LINES.nflMargin.flatMap((line) =>
            (["home", "away"] as const).map((team) => {
              const key = `margin:${team}:${line}`;
              const name = team === "home" ? match.homeTeam : match.awayTeam;
              return (
                <OptionCell
                  key={key}
                  selected={sel(key)}
                  onClick={() => onPick({ key, market: { type: "handicap", team, line }, side: "yes" })}
                  ariaLabel={`${name} win by ${Math.ceil(line)} or more`}
                >
                  <TeamCrest name={name} size={18} />
                  <span className="text-muted">by</span>
                  <span className="font-mono tabular-nums">{Math.ceil(line)}+</span>
                </OptionCell>
              );
            }),
          )}
        </div>
      </Accordion>
      <Accordion title="Total points" icon={<ScoreboardIcon />} summary={summaryFor("pts:")}>
        <OverUnderGrid lines={LINES.nflTotal} unit="points" isSelected={(c, l) => sel(`pts:${c}:${l}`)} onPick={ouPicker(onPick, "pts", "total_points")} />
      </Accordion>
    </>
  );
}

function TeamTotals({ match, pick, onPick }: { match: Match; pick: Pick | null; onPick: (p: Pick) => void }) {
  const [team, setTeam] = useState<"home" | "away">(pick?.market.type === "team_points" ? pick.market.team : "home");
  const name = team === "home" ? match.homeTeam : match.awayTeam;
  return (
    <div className="flex flex-col gap-3 py-4">
      <Segmented
        label="Team"
        value={team}
        onChange={setTeam}
        options={[
          { value: "home", label: match.homeTeam },
          { value: "away", label: match.awayTeam },
        ]}
      />
      <p className="flex items-center gap-2 text-sm text-muted">
        <TeamCrest name={name} size={18} />
        Points {name} score
      </p>
      <OverUnderGrid
        lines={LINES.nflTeam}
        unit={`${name} points`}
        isSelected={(c, l) => pick?.key === `tp:${team}:${c}:${l}`}
        onPick={(c, l) =>
          onPick({ key: `tp:${team}:${c}:${l}`, market: { type: "team_points", team, comparison: c, line: l }, side: "yes" })
        }
      />
    </div>
  );
}

function TeamResultRow({
  match,
  withDraw = false,
  drawLabel = "Draw",
  isSelected,
  onPick,
}: {
  match: Match;
  withDraw?: boolean;
  drawLabel?: string;
  isSelected: (o: "home" | "draw" | "away") => boolean;
  onPick: (o: "home" | "draw" | "away") => void;
}) {
  const outcomes = withDraw ? (["home", "draw", "away"] as const) : (["home", "away"] as const);
  return (
    <div className={`grid gap-2 ${withDraw ? "grid-cols-3" : "grid-cols-2"}`}>
      {outcomes.map((o) => {
        const name = o === "home" ? match.homeTeam : o === "away" ? match.awayTeam : null;
        return (
          <OptionCell key={o} selected={isSelected(o)} onClick={() => onPick(o)} className="!min-h-[80px] flex-col !gap-1.5 py-2.5">
            {name ? (
              <TeamCrest name={name} size={26} />
            ) : (
              <span className="flex h-[29px] items-center font-display text-xl font-bold text-muted">=</span>
            )}
            <span className="line-clamp-2 text-center text-[13px] leading-tight">{name ?? drawLabel}</span>
          </OptionCell>
        );
      })}
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
      className="min-h-12 rounded-md bg-rival-blue px-4 text-sm font-semibold text-white transition-transform duration-150 ease-out active:scale-[0.98]"
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
              <TeamCrest name={teamName} size={16} />
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
          aria-label="Player name"
          placeholder={players.length > 0 ? "Someone else…" : `Type a ${teamName} player…`}
          className="min-h-12 min-w-0 flex-1 rounded-md border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted focus:border-rival-blue focus:outline-none"
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
