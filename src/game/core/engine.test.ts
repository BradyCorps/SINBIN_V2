import { describe, expect, it } from "vitest";
import { OPPONENT_FORMATIONS } from "../content/formations";
import { createInitialGame, previewShot, reduceGame } from "./engine";
import type { GameAction, GameState, OpponentFormationId } from "./types";

function apply(state: GameState, actions: GameAction[]): GameState {
  return actions.reduce(reduceGame, state);
}

function slotCollapseChance(): GameState {
  return apply(createInitialGame("slot-collapse"), [
    { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
    { type: "CYCLE" },
  ]);
}

function turnover(formationId: OpponentFormationId): GameState {
  const start = createInitialGame(formationId);
  const chance =
    formationId === "slot-collapse"
      ? apply(start, [
          { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
          { type: "CYCLE" },
        ])
      : formationId === "wide-denial"
        ? reduceGame(start, { type: "CYCLE" })
        : reduceGame(start, {
            type: "SUBSTITUTE",
            incomingId: "jet",
            slot: "recover",
          });
  return reduceGame(chance, { type: "CYCLE" });
}

function turnoverWithHatch(formationId: OpponentFormationId): GameState {
  let state = createInitialGame(formationId);
  state = reduceGame(state, {
    type: "SUBSTITUTE",
    incomingId: "hatch",
    slot: "finish",
  });
  if (formationId === "slot-collapse" || formationId === "high-press") {
    state = reduceGame(state, {
      type: "SUBSTITUTE",
      incomingId: "jet",
      slot: "recover",
    });
  }
  if (state.puck.state !== "chance")
    state = reduceGame(state, { type: "CYCLE" });
  return reduceGame(state, { type: "CYCLE" });
}

describe("SINBIN V0.5 formation variety rectangle lab", () => {
  it("defines exactly three visibly different deterministic formations", () => {
    expect(Object.keys(OPPONENT_FORMATIONS)).toEqual([
      "slot-collapse",
      "wide-denial",
      "high-press",
    ]);
    expect(createInitialGame("slot-collapse").defence.coverage).toEqual({
      left: "open",
      slot: "covered",
      right: "open",
    });
    expect(createInitialGame("wide-denial").defence.coverage).toEqual({
      left: "covered",
      slot: "open",
      right: "covered",
    });
    expect(createInitialGame("high-press").defence.coverage).toEqual({
      left: "pulled",
      slot: "covered",
      right: "pulled",
    });
  });

  it("preserves the selected formation through restart and reset", () => {
    const started = createInitialGame("wide-denial");
    const restarted = reduceGame(started, { type: "RESTART" });
    const reset = reduceGame(restarted, { type: "RESET_PLAY" });
    expect(restarted.formationId).toBe("wide-denial");
    expect(reset.formationId).toBe("wide-denial");
    expect(reset.defence).toEqual(
      OPPONENT_FORMATIONS["wide-denial"].initialDefence,
    );
  });

  it("requires a developed chance before Ridge can screen", () => {
    const shortcut = apply(createInitialGame("slot-collapse"), [
      { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
      { type: "SUBSTITUTE", incomingId: "ridge", slot: "recover" },
    ]);
    expect(shortcut.puck.state).toBe("controlled");
    expect(shortcut.defence.goalie).toBe("set");
    expect(previewShot(shortcut).result).toBe("save");
  });

  it("Slot Collapse supports Playmaker and Disruptor route branches", () => {
    const playmakerRoute = slotCollapseChance();
    const disruptorRoute = apply(createInitialGame("slot-collapse"), [
      { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
      { type: "SUBSTITUTE", incomingId: "hatch", slot: "create" },
    ]);
    expect(playmakerRoute.puck).toMatchObject({
      lane: "slot",
      state: "chance",
      holderId: "lane",
    });
    expect(disruptorRoute.puck).toMatchObject({
      lane: "left",
      state: "chance",
    });
    expect(disruptorRoute.defence.coverage.left).toBe("open");
  });

  it("Wide Denial supports Carrier or Playmaker entries through the middle", () => {
    const carrierRoute = reduceGame(createInitialGame("wide-denial"), {
      type: "SUBSTITUTE",
      incomingId: "jet",
      slot: "recover",
    });
    const playmakerRoute = reduceGame(createInitialGame("wide-denial"), {
      type: "CYCLE",
    });
    expect(carrierRoute.puck).toMatchObject({
      holderId: "jet",
      lane: "slot",
      state: "chance",
    });
    expect(playmakerRoute.puck).toMatchObject({
      holderId: "lane",
      lane: "slot",
      state: "chance",
    });
  });

  it("High Press creates a fast wide chance but rejects a direct Playmaker entry", () => {
    const carrierRoute = reduceGame(createInitialGame("high-press"), {
      type: "SUBSTITUTE",
      incomingId: "jet",
      slot: "recover",
    });
    const playmakerRoute = reduceGame(createInitialGame("high-press"), {
      type: "CYCLE",
    });
    expect(carrierRoute.puck).toMatchObject({
      lane: "right",
      state: "chance",
    });
    expect(carrierRoute.defence.goalie).toBe("moving");
    expect(playmakerRoute.puck.zone).toBe("neutral");
    expect(playmakerRoute.eventLog.at(-1)?.message).toContain("denies");
  });

  it("High Press supports a safer Disruptor line before the same fast carry", () => {
    const saferLine = apply(createInitialGame("high-press"), [
      { type: "SUBSTITUTE", incomingId: "hatch", slot: "create" },
      { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
      { type: "CYCLE" },
      { type: "PRESSURE_PUCK" },
    ]);
    expect(saferLine.phase).toBe("attack");
    expect(saferLine.eventLog.at(-1)?.message).toContain("TAKEAWAY");
  });

  it("the same short line-change script cannot score against all formations", () => {
    const outcomes = (
      ["slot-collapse", "wide-denial", "high-press"] as const
    ).map((formationId) => {
      const shot = apply(createInitialGame(formationId), [
        { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
        { type: "SUBSTITUTE", incomingId: "ridge", slot: "recover" },
        { type: "SHOOT" },
      ]);
      return shot.status;
    });
    expect(outcomes).toEqual(["breakdown", "goal", "goal"]);
  });

  it.each([
    "slot-collapse",
    "wide-denial",
    "high-press",
  ] as OpponentFormationId[])(
    "%s starts its own counterattack route after overextension",
    (formationId) => {
      const defending = turnover(formationId);
      const opening = OPPONENT_FORMATIONS[formationId].counterRoute[0];
      expect(defending.phase).toBe("defend");
      expect(defending.counterattack).toMatchObject({
        stepIndex: 0,
        puckLane: opening.puckLane,
      });
      expect(defending.eventLog.at(-1)?.message).toContain(opening.label);
    },
  );

  it("Carrier containment moves a middle carry wide and buys one action", () => {
    let defending = reduceGame(createInitialGame("wide-denial"), {
      type: "SUBSTITUTE",
      incomingId: "jet",
      slot: "recover",
    });
    defending = reduceGame(defending, { type: "CYCLE" });
    const contained = reduceGame(defending, { type: "FORCE_WIDE" });
    expect(contained.phase).toBe("defend");
    expect(contained.counterattack).toMatchObject({
      stepIndex: 0,
      puckLane: "left",
      contained: true,
    });
    expect(contained.eventLog.at(-1)?.message).toContain("CONTAIN");
  });

  it("Playmaker intercepts only the predicted passing lane", () => {
    const correct = reduceGame(turnover("slot-collapse"), {
      type: "READ_PASS",
      lane: "right",
    });
    const wrong = reduceGame(turnover("slot-collapse"), {
      type: "READ_PASS",
      lane: "left",
    });
    expect(correct.phase).toBe("attack");
    expect(correct.eventLog.at(-1)?.message).toContain("INTERCEPTION");
    expect(wrong.phase).toBe("defend");
    expect(wrong.counterattack?.stepIndex).toBe(1);
  });

  it.each([
    "slot-collapse",
    "wide-denial",
    "high-press",
  ] as OpponentFormationId[])(
    "%s has deterministic defensive recovery and goal-against outcomes",
    (formationId) => {
      const withoutSpecialist = reduceGame(turnover(formationId), {
        type: "PRESSURE_PUCK",
      });
      expect(withoutSpecialist.phase).toBe("defend");

      const withHatch = turnoverWithHatch(formationId);
      expect(reduceGame(withHatch, { type: "PRESSURE_PUCK" }).phase).toBe(
        "attack",
      );

      let conceded = turnover(formationId);
      const routeLength = OPPONENT_FORMATIONS[formationId].counterRoute.length;
      for (let index = 0; index < routeLength; index += 1) {
        conceded = reduceGame(conceded, {
          type: "READ_PASS",
          lane: "left",
        });
      }
      expect(conceded.status).toBe("goal-against");
    },
  );

  it("a defensive substitution cannot claim the opponent puck", () => {
    const changed = reduceGame(turnover("slot-collapse"), {
      type: "SUBSTITUTE",
      incomingId: "rook",
      slot: "recover",
    });
    expect(changed.phase).toBe("defend");
    expect(changed.puck).toMatchObject({ holderId: null, state: "loose" });
  });
});
