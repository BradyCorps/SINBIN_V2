"use client";

import { useState } from "react";
import {
  PLAYER_DEFINITIONS,
  playerDefinition,
  playerRoleLabel,
} from "@/src/game/content/players";
import { SCOUT_REPORTS, type ScoutReportId } from "@/src/game/content/scouting";
import { formationDefinition } from "@/src/game/content/formations";
import {
  MATCH_LINEUP_BUDGET,
  advanceMatch,
  createMatch,
  isLineupEligible,
  lineupCost,
  lineupFromSelection,
  playerLineupCost,
  type MatchState,
} from "@/src/game/core/match";
import type { PlayerId } from "@/src/game/core/types";
import { GamePrototype } from "./GamePrototype";
import { StageScaler } from "./StageScaler";

const DEFAULT_SELECTION: PlayerId[] = [
  "rook",
  "relay",
  "flare",
  "jet",
  "brace",
  "hatch",
];

const SLOT_NAMES = [
  "Recover",
  "Create",
  "Finish",
  "Bench 1",
  "Bench 2",
  "Bench 3",
] as const;

const PLAYER_READS: Record<PlayerId, string> = {
  rook: "Secure retrieval and specialist clear.",
  lane: "Full route creation and pass interception.",
  flare: "Elite finish; no independent defensive answer.",
  jet: "Specialist carry and one-action containment.",
  ridge: "Full screen, pressure, and crease clear.",
  hatch: "Immediate counterattack strip; lower peak finish.",
  relay: "Carry + create in one entry; goalie stays set.",
  brace: "Retrieve + sustain; hybrid clears return loose.",
  spark: "Disrupt + finish; needs the full opening to score.",
};

function RosterCard({
  id,
  slotIndex,
  onClick,
}: {
  id: PlayerId;
  slotIndex: number;
  onClick: () => void;
}) {
  const player = playerDefinition(id);
  const selected = slotIndex >= 0;
  return (
    <button
      className={`roster-card${selected ? " roster-card--selected" : ""}`}
      style={{ "--player-accent": player.accent } as React.CSSProperties}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${player.name}, ${playerRoleLabel(id)}${selected ? `, selected in ${SLOT_NAMES[slotIndex]}` : ", available"}`}
    >
      <span>{player.secondaryRole ? "HYBRID" : "SPECIALIST"}</span>
      <strong>{player.shortName}</strong>
      <em>{playerRoleLabel(id)}</em>
      <p>{PLAYER_READS[id]}</p>
      <small>
        {selected
          ? SLOT_NAMES[slotIndex]
          : `${playerLineupCost(id)} PT${playerLineupCost(id) === 1 ? "" : "S"}`}
      </small>
    </button>
  );
}

function MatchComplete({
  match,
  onReset,
}: {
  match: MatchState;
  onReset: () => void;
}) {
  const result =
    match.goalsFor > match.goalsAgainst
      ? "WIN"
      : match.goalsFor < match.goalsAgainst
        ? "LOSS"
        : "DRAW";
  return (
    <main className="prototype-viewport">
      <StageScaler>
        <section className="v06-complete" aria-label="Three-shift match result">
          <small>V0.6 THREE-SHIFT RESULT</small>
          <strong>{result}</strong>
          <p>
            {match.goalsFor} GOALS FOR · {match.goalsAgainst} GOALS AGAINST
          </p>
          <span>
            {SCOUT_REPORTS[match.scoutReportId].label} · SIX-SKATER LINEUP
          </span>
          <button onClick={onReset}>SCOUT ANOTHER MATCH</button>
        </section>
      </StageScaler>
    </main>
  );
}

export function RosterLab() {
  const [scoutReportId, setScoutReportId] =
    useState<ScoutReportId>("wide-rush");
  const [selectedSlots, setSelectedSlots] =
    useState<(PlayerId | null)[]>(DEFAULT_SELECTION);
  const [match, setMatch] = useState<MatchState | null>(null);

  if (match?.status === "complete") {
    return <MatchComplete match={match} onReset={() => setMatch(null)} />;
  }

  if (match) {
    return (
      <GamePrototype
        key={`${match.scoutReportId}-${match.shiftIndex}`}
        initialState={match.shift}
        formationLocked
        matchDisplay={{
          shift: match.shiftIndex + 1,
          totalShifts: 3,
          goalsFor: match.goalsFor,
          goalsAgainst: match.goalsAgainst,
        }}
        onShiftResolved={(resolvedShift) =>
          setMatch((current) =>
            current ? advanceMatch(current, resolvedShift) : current,
          )
        }
      />
    );
  }

  const report = SCOUT_REPORTS[scoutReportId];
  const selected = selectedSlots.filter((id): id is PlayerId => id !== null);
  const selectedCost = lineupCost(selected);
  const lineupEligible = isLineupEligible(selected);
  const togglePlayer = (id: PlayerId) => {
    setSelectedSlots((current) => {
      const existingIndex = current.indexOf(id);
      if (existingIndex >= 0) {
        return current.map((playerId, index) =>
          index === existingIndex ? null : playerId,
        );
      }
      const openIndex = current.indexOf(null);
      if (openIndex < 0) return current;
      return current.map((playerId, index) =>
        index === openIndex ? id : playerId,
      );
    });
  };
  const moveSlot = (fromIndex: number, toIndex: number) => {
    setSelectedSlots((current) => {
      const next = [...current];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
  };

  return (
    <main className="prototype-viewport">
      <StageScaler>
        <section
          className="v06-stage"
          aria-label="V0.6 scouting and line construction lab"
        >
          <header className="v06-header">
            <div>
              <small>V0.6 RECTANGLE TEST</small>
              <strong>SCOUT + BUILD</strong>
              <span>READ THREE SHIFTS · CHOOSE SIX SKATERS</span>
            </div>
            <p>NO MOMENTUM TARGET · GOALS FOR / AGAINST</p>
          </header>

          <aside className="scout-panel">
            <span>OPPONENT REPORT</span>
            <select
              aria-label="Scout report"
              value={scoutReportId}
              onChange={(event) =>
                setScoutReportId(event.target.value as ScoutReportId)
              }
            >
              {Object.values(SCOUT_REPORTS).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <strong>{report.label}</strong>
            <p>{report.read}</p>
            <ol>
              {report.formations.map((formationId, index) => {
                const formation = formationDefinition(formationId);
                return (
                  <li key={`${formationId}-${index}`}>
                    <i>{index + 1}</i>
                    <div>
                      <b>{formation.label}</b>
                      <small>{formation.weakPoint}</small>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>

          <section className="roster-pool" aria-label="Available skaters">
            <header>
              <span>SCOUTING POOL · NINE RECTANGLES</span>
              <strong>
                {selected.length}/6 · {selectedCost}/{MATCH_LINEUP_BUDGET} PTS
              </strong>
            </header>
            <div>
              {Object.keys(PLAYER_DEFINITIONS).map((id) => (
                <RosterCard
                  key={id}
                  id={id}
                  slotIndex={selectedSlots.indexOf(id)}
                  onClick={() => togglePlayer(id)}
                />
              ))}
            </div>
          </section>

          <aside className="lineup-panel" aria-label="Selected lineup">
            <span>LINE CONSTRUCTION · SPECIALIST 2 / HYBRID 1</span>
            <ol>
              {SLOT_NAMES.map((slot, index) => {
                const id = selectedSlots[index];
                return (
                  <li key={slot} className={id ? "filled" : ""}>
                    <div>
                      <small>{slot}</small>
                      <strong>
                        {id ? playerDefinition(id).shortName : "OPEN"}
                      </strong>
                      <em>{id ? playerRoleLabel(id) : "Choose a skater"}</em>
                    </div>
                    <nav aria-label={`${slot} slot controls`}>
                      <button
                        type="button"
                        aria-label={`Move ${slot} up`}
                        disabled={index === 0}
                        onClick={() => moveSlot(index, index - 1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${slot} down`}
                        disabled={index === SLOT_NAMES.length - 1}
                        onClick={() => moveSlot(index, index + 1)}
                      >
                        ↓
                      </button>
                    </nav>
                  </li>
                );
              })}
            </ol>
            <button onClick={() => setSelectedSlots(Array(6).fill(null))}>
              CLEAR LINE
            </button>
            <button
              className="start-match"
              disabled={!lineupEligible}
              onClick={() =>
                setMatch(
                  createMatch(lineupFromSelection(selected), scoutReportId),
                )
              }
            >
              {selected.length !== 6
                ? "CHOOSE SIX SKATERS"
                : selectedCost > MATCH_LINEUP_BUDGET
                  ? `OVER BUDGET · ${selectedCost}/${MATCH_LINEUP_BUDGET}`
                  : "START THREE SHIFTS"}
            </button>
          </aside>

          <footer className="v06-footer">
            <strong>QUESTION</strong>
            <p>
              When you see this opponent, do you want a different six—and can
              you feel that decision during the shift?
            </p>
          </footer>
        </section>
      </StageScaler>
    </main>
  );
}
