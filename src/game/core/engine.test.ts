import { describe, expect, it } from "vitest";
import { liveTick, tacticalBeat } from "../clocks/policies";
import {
  createInitialGame,
  periodResult,
  previewShot,
  reduceGame,
} from "./engine";
import {
  clutchChangeScenario,
  earlyCashoutScenario,
  entryExitChainScenario,
  fifthShiftScenario,
  pressureTurnoverScenario,
  reentryLockScenario,
  retrievalScenario,
  shotReadyScenario,
  staminaTurnoverScenario,
} from "../testing/scenarios";
import type { GameAction, GameState } from "./types";

function apply(state: GameState, actions: GameAction[]): GameState {
  return actions.reduce(reduceGame, state);
}

describe("SINBIN deterministic shift engine", () => {
  it("S01_OPENING starts with six unique players and a loose puck", () => {
    const state = createInitialGame();
    const roster = [...Object.values(state.active), ...state.bench];
    expect(new Set(roster).size).toBe(6);
    expect(state.puck.phase).toBe("loose-puck");
    expect(state.status).toBe("playing");
  });

  it("S02_RETRIEVAL uses the Retriever to establish possession", () => {
    const next = reduceGame(retrievalScenario(), {
      type: "SUBSTITUTE",
      incomingId: "rook",
      slot: "recover",
    });
    expect(next.puck.phase).toBe("controlled");
    expect(next.puck.holderId).toBe("rook");
    expect(next.momentum).toBeGreaterThanOrEqual(450);
  });

  it("S03_ENTRY_EXIT_CHAIN resolves Exit before Entry and reaches shot-ready", () => {
    const next = reduceGame(entryExitChainScenario(), {
      type: "SUBSTITUTE",
      incomingId: "lane",
      slot: "recover",
    });
    const types = next.eventLog.map((event) => event.type);
    expect(types.indexOf("EXIT_EFFECT")).toBeLessThan(
      types.indexOf("SUBSTITUTION"),
    );
    expect(types.indexOf("SUBSTITUTION")).toBeLessThan(
      types.lastIndexOf("PLAY_ADVANCED"),
    );
    expect(next.puck.phase).toBe("shot-ready");
    expect(next.puck.holderId).toBe("flare");
  });

  it("S04_SHOT_READY exposes a transparent deterministic shot", () => {
    const state = shotReadyScenario();
    const preview = previewShot(state);
    expect(preview.quality).toBe(1);
    expect(preview.banked).toBe(3_650);
    expect(preview.formula).toContain("4,250 × 1.00 − 600 = 3,650");
  });

  it("S05_EARLY_CASHOUT banks a smaller but valid controlled result", () => {
    const next = reduceGame(earlyCashoutScenario(), { type: "SHOOT" });
    expect(next.lastBankedAmount).toBe(600);
    expect(next.bankedMomentum).toBe(600);
    expect(next.status).toBe("banked");
  });

  it("S06_CLUTCH_CHANGE clears an exhausted-player danger window", () => {
    const next = reduceGame(clutchChangeScenario(), {
      type: "SUBSTITUTE",
      incomingId: "hatch",
      slot: "recover",
    });
    expect(next.status).toBe("playing");
    expect(next.dangerRemainingMs).toBeNull();
    expect(next.pressure).toBeLessThan(91);
  });

  it("S07_STAMINA_TURNOVER loses unbanked Momentum after danger expires", () => {
    const next = reduceGame(staminaTurnoverScenario(), {
      type: "ADVANCE_CLOCK",
      elapsedMs: 600,
    });
    expect(next.status).toBe("turnover");
    expect(next.momentum).toBe(0);
    expect(next.eventLog.at(-1)?.message).toContain("exhausted");
  });

  it("S08_PRESSURE_TURNOVER has a distinct explainable cause", () => {
    const next = reduceGame(pressureTurnoverScenario(), {
      type: "ADVANCE_CLOCK",
      elapsedMs: 1_000,
    });
    expect(next.status).toBe("turnover");
    expect(next.eventLog.at(-1)?.message).toContain("Pressure reached 100");
  });

  it("S09_REENTRY_LOCK rejects immediate cycling", () => {
    const changed = reduceGame(reentryLockScenario(), {
      type: "SUBSTITUTE",
      incomingId: "rook",
      slot: "recover",
    });
    const rejected = reduceGame(changed, {
      type: "SUBSTITUTE",
      incomingId: "ridge",
      slot: "create",
    });
    expect(rejected.active.create).toBe(changed.active.create);
    expect(rejected.eventLog.at(-1)?.type).toBe("RULE_REJECTED");
  });

  it("S10_FIVE_SHIFT_PERIOD resolves the period target", () => {
    const next = reduceGame(fifthShiftScenario(), { type: "SHOOT" });
    expect(next.status).toBe("period-complete");
    expect(next.bankedMomentum).toBe(11_650);
    expect(periodResult(next)).toBe("win");
  });

  it("S11_TACTICAL_LIVE_EQUIVALENCE resolves identical engine events equally", () => {
    const base = shotReadyScenario();
    const tactical = reduceGame(base, tacticalBeat());
    const live = apply(
      base,
      Array.from({ length: 10 }, () => liveTick(100)),
    );
    expect(live.pressure).toBeCloseTo(tactical.pressure, 8);
    expect(live.momentum).toBe(tactical.momentum);
    expect(live.players).toEqual(tactical.players);
    expect(live.puck).toEqual(tactical.puck);
  });

  it("S12_REPLAY produces an identical state and ordered event log", () => {
    const actions: GameAction[] = [
      { type: "SUBSTITUTE", incomingId: "rook", slot: "recover" },
      tacticalBeat(),
      { type: "SUBSTITUTE", incomingId: "jet", slot: "recover" },
      tacticalBeat(),
      { type: "SHOOT" },
    ];
    expect(apply(createInitialGame(), actions)).toEqual(
      apply(createInitialGame(), actions),
    );
  });
});
