import { SCOUT_REPORTS, type ScoutReportId } from "../content/scouting";
import { createInitialGame } from "./engine";
import {
  ACTIVE_SLOTS,
  type GameState,
  type LineupDefinition,
  type PlayerId,
} from "./types";

export interface MatchState {
  scoutReportId: ScoutReportId;
  lineup: LineupDefinition;
  shiftIndex: number;
  goalsFor: number;
  goalsAgainst: number;
  status: "playing" | "complete";
  shift: GameState;
}

export function lineupFromSelection(
  playerIds: readonly PlayerId[],
): LineupDefinition {
  if (playerIds.length !== 6 || new Set(playerIds).size !== 6) {
    throw new Error("A match lineup requires six unique skaters.");
  }
  return {
    active: {
      recover: playerIds[0],
      create: playerIds[1],
      finish: playerIds[2],
    },
    bench: [playerIds[3], playerIds[4], playerIds[5]],
  };
}

export function selectedPlayerIds(lineup: LineupDefinition): PlayerId[] {
  return [...ACTIVE_SLOTS.map((slot) => lineup.active[slot]), ...lineup.bench];
}

export function createMatch(
  lineup: LineupDefinition,
  scoutReportId: ScoutReportId,
): MatchState {
  const selected = selectedPlayerIds(lineup);
  if (selected.length !== 6 || new Set(selected).size !== 6) {
    throw new Error("A match lineup requires six unique skaters.");
  }
  const report = SCOUT_REPORTS[scoutReportId];
  return {
    scoutReportId,
    lineup: structuredClone(lineup),
    shiftIndex: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    status: "playing",
    shift: createInitialGame(report.formations[0], lineup),
  };
}

export function advanceMatch(
  match: MatchState,
  resolvedShift: GameState,
): MatchState {
  if (match.status !== "playing" || resolvedShift.status === "playing") {
    throw new Error("Only a resolved shift can advance a playing match.");
  }
  const goalsFor = match.goalsFor + (resolvedShift.status === "goal" ? 1 : 0);
  const goalsAgainst =
    match.goalsAgainst + (resolvedShift.status === "goal-against" ? 1 : 0);
  const nextIndex = match.shiftIndex + 1;
  if (nextIndex >= 3) {
    return {
      ...match,
      goalsFor,
      goalsAgainst,
      status: "complete",
      shift: resolvedShift,
    };
  }
  const report = SCOUT_REPORTS[match.scoutReportId];
  return {
    ...match,
    shiftIndex: nextIndex,
    goalsFor,
    goalsAgainst,
    shift: createInitialGame(report.formations[nextIndex], match.lineup),
  };
}
