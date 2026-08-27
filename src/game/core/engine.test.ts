import { describe, expect, it } from "vitest";
import { createInitialGame, previewShot, reduceGame } from "./engine";
import type { GameAction, GameState } from "./types";

function apply(state: GameState, actions: GameAction[]): GameState {
  return actions.reduce(reduceGame, state);
}

const routeToChance: GameAction[] = [
  { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
  { type: "CYCLE" },
];

describe("SINBIN V0.4 counterattack rectangle lab", () => {
  it("starts with a visible set defence and controlled neutral-zone puck", () => {
    const state = createInitialGame();
    expect(state.active).toEqual({
      recover: "rook",
      create: "lane",
      finish: "flare",
    });
    expect(state.puck).toMatchObject({
      holderId: "rook",
      zone: "neutral",
      lane: "left",
      state: "controlled",
    });
    expect(state.defence.coverage).toEqual({
      left: "covered",
      slot: "covered",
      right: "covered",
    });
    expect(state.defence.goalie).toBe("set");
  });

  it("a Carrier entry advances the puck and visibly pulls the lane defender", () => {
    const next = reduceGame(createInitialGame(), {
      type: "SUBSTITUTE",
      incomingId: "jet",
      slot: "recover",
    });
    expect(next.puck).toMatchObject({ holderId: "jet", zone: "offensive" });
    expect(next.defence.coverage.left).toBe("pulled");
    expect(next.eventLog.at(-1)?.message).toContain("pulls the left defender");
  });

  it("a Playmaker cycle crosses the puck and makes the goalie move", () => {
    const next = apply(createInitialGame(), routeToChance);
    expect(next.puck).toMatchObject({
      holderId: "lane",
      lane: "right",
      state: "chance",
    });
    expect(next.defence.coverage.left).toBe("open");
    expect(next.defence.coverage.right).toBe("pulled");
    expect(next.defence.goalie).toBe("moving");
  });

  it("a Grinder change creates the final screen and deterministic goal", () => {
    const next = apply(createInitialGame(), [
      ...routeToChance,
      { type: "SUBSTITUTE", incomingId: "ridge", slot: "recover" },
    ]);
    const preview = previewShot(next);
    expect(next.defence.goalie).toBe("screened");
    expect(next.defence.coverage.right).toBe("pinned");
    expect(preview.rating).toBe(5);
    expect(preview.result).toBe("goal");
    expect(reduceGame(next, { type: "SHOOT" }).status).toBe("goal");
  });

  it("shooting before the screen is a dead-play breakdown with a reason", () => {
    const next = apply(createInitialGame(), routeToChance);
    const preview = previewShot(next);
    expect(preview.rating).toBe(4);
    expect(preview.result).toBe("save");
    expect(reduceGame(next, { type: "SHOOT" }).status).toBe("breakdown");
  });

  it("overextending a chance hands the puck to a visible AI counterattack", () => {
    const next = apply(createInitialGame(), [
      ...routeToChance,
      { type: "CYCLE" },
    ]);
    expect(next.phase).toBe("defend");
    expect(next.counterattack).toMatchObject({
      route: "carry",
      puckLane: "left",
    });
    expect(next.eventLog.at(-1)?.type).toBe("TURNOVER");
  });

  it("Flare gains visible discipline before the overextension becomes a turnover", () => {
    const next = apply(createInitialGame(), [...routeToChance]);
    expect(next.players.flare.discipline).toBe(50);
    expect(next.penalty).toBeNull();
  });

  it("a player cannot immediately cycle back in after being removed", () => {
    const changed = reduceGame(createInitialGame(), {
      type: "SUBSTITUTE",
      incomingId: "jet",
      slot: "recover",
    });
    const rejected = reduceGame(changed, {
      type: "SUBSTITUTE",
      incomingId: "rook",
      slot: "recover",
    });
    expect(rejected.active.recover).toBe("jet");
    expect(rejected.eventLog.at(-1)?.type).toBe("RULE_REJECTED");
  });

  it("Hatch turns a turnover into an immediate defensive takeaway", () => {
    const defending = apply(createInitialGame(), [
      ...routeToChance,
      { type: "CYCLE" },
      { type: "SUBSTITUTE", incomingId: "hatch", slot: "finish" },
      { type: "PRESSURE_PUCK" },
    ]);
    expect(defending.phase).toBe("attack");
    expect(defending.counterattack).toBeNull();
    expect(defending.puck).toMatchObject({ zone: "neutral", state: "loose" });
    expect(defending.eventLog.at(-1)?.type).toBe("DEFENSIVE_STOP");
  });

  it("closing the right lane intercepts the AI's first cross-ice pass", () => {
    const defending = apply(createInitialGame(), [
      ...routeToChance,
      { type: "CYCLE" },
      { type: "CLOSE_LANE", lane: "right" },
    ]);
    expect(defending.phase).toBe("attack");
    expect(defending.counterattack).toBeNull();
    expect(defending.eventLog.at(-1)?.message).toContain("INTERCEPTION");
  });

  it("a weak pressure response lets the AI advance to the cross-ice route", () => {
    const defending = apply(createInitialGame(), [
      ...routeToChance,
      { type: "CYCLE" },
      { type: "PRESSURE_PUCK" },
    ]);
    expect(defending.phase).toBe("defend");
    expect(defending.counterattack).toMatchObject({
      route: "cross-ice",
      puckLane: "right",
    });
    expect(defending.eventLog.at(-1)?.message).toContain("slot");
  });

  it("an uncovered net-front route becomes a goal against", () => {
    const defending = apply(createInitialGame(), [
      ...routeToChance,
      { type: "CYCLE" },
      { type: "PRESSURE_PUCK" },
      { type: "CLOSE_LANE", lane: "left" },
      { type: "CLEAR_NET_FRONT" },
    ]);
    expect(defending.status).toBe("goal-against");
  });
});
