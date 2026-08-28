import { describe, expect, it } from "vitest";
import { createInitialGame, previewShot, reduceGame } from "./engine";
import {
  MATCH_LINEUP_BUDGET,
  advanceMatch,
  createMatch,
  isLineupEligible,
  lineupCost,
  lineupFromSelection,
} from "./match";
import type { GameAction, GameState } from "./types";

function apply(state: GameState, actions: GameAction[]): GameState {
  return actions.reduce(reduceGame, state);
}

const specialistLineup = lineupFromSelection([
  "rook",
  "lane",
  "flare",
  "jet",
  "ridge",
  "hatch",
]);

const compressedLineup = lineupFromSelection([
  "rook",
  "relay",
  "flare",
  "jet",
  "brace",
  "hatch",
]);

describe("SINBIN V0.6 scouting and line construction lab", () => {
  it("builds six ordered lineup slots from six unique selections", () => {
    expect(specialistLineup).toEqual({
      active: { recover: "rook", create: "lane", finish: "flare" },
      bench: ["jet", "ridge", "hatch"],
    });
    expect(() => lineupFromSelection(["rook", "rook"])).toThrow(
      "six unique skaters",
    );
  });

  it("requires two role-compression choices for a match lineup", () => {
    expect(lineupCost(["rook", "lane", "flare", "jet", "ridge", "hatch"])).toBe(
      12,
    );
    expect(
      lineupCost(["rook", "relay", "flare", "jet", "ridge", "hatch"]),
    ).toBe(11);
    expect(
      lineupCost(["rook", "relay", "flare", "jet", "brace", "hatch"]),
    ).toBe(MATCH_LINEUP_BUDGET);
    expect(
      isLineupEligible(["rook", "lane", "flare", "jet", "ridge", "hatch"]),
    ).toBe(false);
    expect(
      isLineupEligible(["rook", "relay", "flare", "jet", "brace", "hatch"]),
    ).toBe(true);
    expect(() => createMatch(specialistLineup, "wide-rush")).toThrow(
      "10-point lineup budget",
    );
  });

  it("Flare converts the early High Press chance that hybrid Spark cannot", () => {
    const withFlare = reduceGame(
      createInitialGame("high-press", specialistLineup),
      { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
    );
    const withSpark = reduceGame(
      createInitialGame(
        "high-press",
        lineupFromSelection(["rook", "lane", "spark", "jet", "ridge", "hatch"]),
      ),
      { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
    );
    expect(previewShot(withFlare)).toMatchObject({ rating: 5, result: "goal" });
    expect(previewShot(withSpark)).toMatchObject({ rating: 4, result: "save" });

    const fullyBuilt = reduceGame(withSpark, {
      type: "SUBSTITUTE",
      incomingId: "ridge",
      slot: "recover",
    });
    expect(previewShot(fullyBuilt)).toMatchObject({
      rating: 5,
      result: "goal",
    });
  });

  it("Relay compresses carry and creation but leaves the goalie set", () => {
    const relayEntry = reduceGame(
      createInitialGame(
        "slot-collapse",
        lineupFromSelection([
          "rook",
          "lane",
          "spark",
          "relay",
          "ridge",
          "hatch",
        ]),
      ),
      { type: "SUBSTITUTE", incomingId: "relay", slot: "recover" },
    );
    expect(relayEntry.puck).toMatchObject({
      holderId: "relay",
      zone: "offensive",
      state: "chance",
    });
    expect(relayEntry.defence.goalie).toBe("set");
    expect(previewShot(relayEntry).result).toBe("save");
  });

  it("Brace clears a terminal chance but returns a loose puck", () => {
    let state = createInitialGame(
      "wide-denial",
      lineupFromSelection(["brace", "relay", "spark", "jet", "flare", "hatch"]),
    );
    state = apply(state, [
      { type: "CYCLE" },
      { type: "CYCLE" },
      { type: "READ_PASS", lane: "left" },
      { type: "CLEAR_NET_FRONT" },
    ]);
    expect(state.phase).toBe("attack");
    expect(state.puck).toMatchObject({ holderId: null, state: "loose" });
    expect(state.eventLog.at(-1)?.message).toContain("HYBRID CLEAR");
  });

  it("Flare cannot be replaced by Hatch for free after a fast turnover", () => {
    let lateChange = createInitialGame("high-press", specialistLineup);
    lateChange = apply(lateChange, [
      { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
      { type: "CYCLE" },
      { type: "SUBSTITUTE", incomingId: "hatch", slot: "finish" },
      { type: "PRESSURE_PUCK" },
    ]);
    expect(lateChange.status).toBe("goal-against");

    const safeLineup = lineupFromSelection([
      "rook",
      "lane",
      "hatch",
      "jet",
      "ridge",
      "flare",
    ]);
    const prepared = apply(createInitialGame("high-press", safeLineup), [
      { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
      { type: "CYCLE" },
      { type: "PRESSURE_PUCK" },
    ]);
    expect(prepared.phase).toBe("attack");
    expect(prepared.eventLog.at(-1)?.message).toContain("TAKEAWAY");
  });

  it("runs exactly three known shifts and records goals for and against", () => {
    let match = createMatch(compressedLineup, "wide-rush");
    expect(match.shift.formationId).toBe("wide-denial");

    const goal = apply(match.shift, [
      { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
      { type: "SHOOT" },
    ]);
    match = advanceMatch(match, goal);
    expect(match).toMatchObject({
      shiftIndex: 1,
      goalsFor: 1,
      goalsAgainst: 0,
      status: "playing",
    });
    expect(match.shift.formationId).toBe("high-press");

    const deadShot = reduceGame(match.shift, { type: "SHOOT" });
    match = advanceMatch(match, deadShot);
    expect(match.shiftIndex).toBe(2);
    expect(match.shift.formationId).toBe("wide-denial");

    const conceded = apply(match.shift, [
      { type: "CYCLE" },
      { type: "CYCLE" },
      { type: "PRESSURE_PUCK" },
      { type: "READ_PASS", lane: "left" },
    ]);
    expect(conceded.status).toBe("goal-against");
    match = advanceMatch(match, conceded);
    expect(match).toMatchObject({
      goalsFor: 1,
      goalsAgainst: 1,
      status: "complete",
    });
  });
});
