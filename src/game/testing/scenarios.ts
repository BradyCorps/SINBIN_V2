import { createInitialGame, reduceGame } from "../core/engine";
import type { GameState, OpponentFormationId } from "../core/types";

export function formationOpeningScenario(
  formationId: OpponentFormationId,
): GameState {
  return createInitialGame(formationId);
}

export function crossIceChanceScenario(): GameState {
  let state = createInitialGame();
  state = reduceGame(state, {
    type: "SUBSTITUTE",
    incomingId: "jet",
    slot: "recover",
  });
  return reduceGame(state, { type: "CYCLE" });
}

export function exposedNetScenario(): GameState {
  return reduceGame(crossIceChanceScenario(), {
    type: "SUBSTITUTE",
    incomingId: "ridge",
    slot: "recover",
  });
}

export function counterattackScenario(): GameState {
  return reduceGame(crossIceChanceScenario(), { type: "CYCLE" });
}
