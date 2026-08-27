import { playerDefinition } from "../content/players";
import { createInitialGame } from "../core/engine";
import type { GameState } from "../core/types";

function clone(state: GameState): GameState {
  return structuredClone(state);
}

function controlledBase(): GameState {
  const state = createInitialGame();
  state.puck.phase = "controlled";
  state.puck.holderId = state.active.recover;
  state.momentum = 900;
  return state;
}

export function openingScenario(): GameState {
  return createInitialGame();
}

export function retrievalScenario(): GameState {
  const state = createInitialGame();
  state.pressure = 18;
  return state;
}

export function entryExitChainScenario(): GameState {
  const state = controlledBase();
  state.active.create = "jet";
  state.bench = ["rook", "lane", "hatch"];
  return state;
}

export function shotReadyScenario(): GameState {
  const state = createInitialGame();
  state.puck.phase = "shot-ready";
  state.puck.holderId = state.active.finish;
  state.momentum = 4_250;
  state.pressure = 72;
  state.players[state.active.finish].stamina = 16;
  return state;
}

export function earlyCashoutScenario(): GameState {
  const state = controlledBase();
  state.momentum = 3_000;
  return state;
}

export function clutchChangeScenario(): GameState {
  const state = shotReadyScenario();
  state.players[state.active.recover].stamina = 0;
  state.dangerRemainingMs = 300;
  state.pressure = 91;
  return state;
}

export function staminaTurnoverScenario(): GameState {
  const state = createInitialGame();
  state.players[state.active.recover].stamina = 0;
  state.dangerRemainingMs = 600;
  state.momentum = 2_200;
  return state;
}

export function pressureTurnoverScenario(): GameState {
  const state = createInitialGame();
  state.pressure = 98;
  state.momentum = 2_200;
  return state;
}

export function reentryLockScenario(): GameState {
  return createInitialGame();
}

export function fifthShiftScenario(): GameState {
  const state = shotReadyScenario();
  state.shiftNumber = 5;
  state.bankedMomentum = 8_000;
  return state;
}

export const SCENARIOS = {
  S01_OPENING: openingScenario,
  S02_RETRIEVAL: retrievalScenario,
  S03_ENTRY_EXIT_CHAIN: entryExitChainScenario,
  S04_SHOT_READY: shotReadyScenario,
  S05_EARLY_CASHOUT: earlyCashoutScenario,
  S06_CLUTCH_CHANGE: clutchChangeScenario,
  S07_STAMINA_TURNOVER: staminaTurnoverScenario,
  S08_PRESSURE_TURNOVER: pressureTurnoverScenario,
  S09_REENTRY_LOCK: reentryLockScenario,
  S10_FIVE_SHIFT_PERIOD: fifthShiftScenario,
} as const;

export type ScenarioId = keyof typeof SCENARIOS;

export function scenario(id: ScenarioId): GameState {
  return clone(SCENARIOS[id]());
}

export function refillStamina(state: GameState): GameState {
  const next = clone(state);
  for (const [id, runtime] of Object.entries(next.players)) {
    runtime.stamina = playerDefinition(id).maxStamina;
  }
  return next;
}
