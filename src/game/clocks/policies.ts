import type { GameAction } from "../core/types";

export const TACTICAL_BEAT_MS = 1_000;
export const LIVE_TICK_MS = 100;

export function tacticalBeat(): GameAction {
  return { type: "ADVANCE_CLOCK", elapsedMs: TACTICAL_BEAT_MS };
}

export function liveTick(elapsedMs = LIVE_TICK_MS): GameAction {
  return {
    type: "ADVANCE_CLOCK",
    elapsedMs: Math.max(0, Math.min(elapsedMs, 250)),
  };
}
