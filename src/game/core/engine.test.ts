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

describe("SINBIN V0.3 defensive structure lab", () => {
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

  it("shooting before the screen is a deterministic save with a reason", () => {
    const next = apply(createInitialGame(), routeToChance);
    const preview = previewShot(next);
    expect(preview.rating).toBe(4);
    expect(preview.result).toBe("save");
    expect(reduceGame(next, { type: "SHOOT" }).status).toBe("save");
  });

  it("extending a chance lets the defence recover instead of farming value", () => {
    const next = apply(createInitialGame(), [
      ...routeToChance,
      { type: "CYCLE" },
    ]);
    expect(next.puck.state).toBe("controlled");
    expect(next.defence.goalie).toBe("set");
    expect(next.defence.coverage).toEqual({
      left: "covered",
      slot: "covered",
      right: "covered",
    });
    expect(next.counterThreat).toBeGreaterThan(20);
  });

  it("Flare eventually takes a visible SINBIN penalty when the play is overextended", () => {
    const next = apply(createInitialGame(), [
      ...routeToChance,
      { type: "CYCLE" },
    ]);
    expect(next.penalty).toMatchObject({ playerId: "flare" });
    expect(next.eventLog.some((event) => event.type === "PENALTY")).toBe(true);
    expect(previewShot(next).factors.at(-1)?.active).toBe(false);
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
});
