import {
  INITIAL_ACTIVE,
  INITIAL_BENCH,
  PLAYER_DEFINITIONS,
  playerDefinition,
} from "../content/players";
import {
  ACTIVE_SLOTS,
  type ActiveSlot,
  type GameAction,
  type GameEvent,
  type GameState,
  type PlayPhase,
  type PlayerId,
  type ShotPreview,
} from "./types";

const ACTIVE_STAMINA_DRAIN_PER_SECOND = 4;
const PRESSURE_GAIN_PER_SECOND = 3;
const SUBSTITUTION_PRESSURE = 4;
const DANGER_WINDOW_MS = 600;
const REENTRY_LOCK_MS = 2_000;

const PHASE_QUALITY: Record<PlayPhase, number> = {
  "loose-puck": 0.2,
  controlled: 0.4,
  "zone-entry": 0.6,
  "scoring-setup": 0.82,
  "shot-ready": 1,
};

const PHASE_DRIP_PER_SECOND: Record<PlayPhase, number> = {
  "loose-puck": 0,
  controlled: 8,
  "zone-entry": 20,
  "scoring-setup": 35,
  "shot-ready": 80,
};

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundEngineValue(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function appendEvent(
  state: GameState,
  type: GameEvent["type"],
  message: string,
): void {
  state.eventSequence += 1;
  state.eventLog.push({ id: state.eventSequence, type, message });
  if (state.eventLog.length > 40) state.eventLog.shift();
}

function activeIds(state: GameState): PlayerId[] {
  return ACTIVE_SLOTS.map((slot) => state.active[slot]);
}

function activePlayerWithRole(
  state: GameState,
  role: "Playmaker" | "Sniper",
): PlayerId | null {
  return (
    activeIds(state).find((id) => playerDefinition(id).role === role) ?? null
  );
}

function assertValidState(state: GameState): void {
  const roster = [...activeIds(state), ...state.bench];
  if (roster.length !== 6 || new Set(roster).size !== 6) {
    throw new Error("A SINBIN lineup must contain six unique players.");
  }
  if (
    state.puck.holderId !== null &&
    !activeIds(state).includes(state.puck.holderId)
  ) {
    throw new Error("The puck holder must be active.");
  }
  if (state.pressure < 0 || state.pressure > 100) {
    throw new Error("Pressure must remain between 0 and 100.");
  }
  for (const id of roster) {
    const runtime = state.players[id];
    const definition = playerDefinition(id);
    if (!runtime) throw new Error(`Missing runtime state for ${id}.`);
    if (runtime.stamina < 0 || runtime.stamina > definition.maxStamina) {
      throw new Error(`Invalid Stamina for ${id}.`);
    }
  }
}

export function createInitialGame(): GameState {
  const players = Object.fromEntries(
    Object.values(PLAYER_DEFINITIONS).map((player) => [
      player.id,
      { stamina: player.maxStamina, reentryLockMs: 0 },
    ]),
  );

  const state: GameState = {
    active: { ...INITIAL_ACTIVE },
    bench: [...INITIAL_BENCH],
    players,
    puck: {
      holderId: null,
      phase: "loose-puck",
      handoffProtected: false,
    },
    pressure: 0,
    momentum: 0,
    bankedMomentum: 0,
    goalieDefence: 600,
    periodTarget: 10_000,
    shiftNumber: 1,
    maximumShifts: 5,
    status: "playing",
    lastShiftOutcome: null,
    lastBankedAmount: 0,
    dangerRemainingMs: null,
    elapsedMs: 0,
    eventSequence: 0,
    eventLog: [],
  };
  appendEvent(state, "SHIFT_STARTED", "Shift 1 started with a loose puck.");
  assertValidState(state);
  return state;
}

function resolveExitEffect(state: GameState, outgoingId: PlayerId): void {
  const outgoing = playerDefinition(outgoingId);
  switch (outgoing.exitEffect) {
    case "protect-handoff":
      state.puck.handoffProtected = true;
      state.pressure = clamp(state.pressure - 4, 0, 100);
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} protected the handoff and relieved 4 Pressure.`,
      );
      break;
    case "leave-lane":
      state.puck.handoffProtected = true;
      if (
        state.puck.phase === "zone-entry" ||
        state.puck.phase === "scoring-setup"
      ) {
        state.momentum += 200;
      }
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} left the lane open for the incoming player.`,
      );
      break;
    case "bank-setup":
      if (state.puck.phase === "scoring-setup") state.momentum += 300;
      state.puck.handoffProtected = true;
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} preserved the shape of the setup.`,
      );
      break;
    case "create-rebound":
      if (state.puck.phase === "shot-ready") state.momentum += 350;
      state.puck.handoffProtected = true;
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} left a live rebound.`,
      );
      break;
    case "draw-coverage":
      state.pressure = clamp(state.pressure - 8, 0, 100);
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} pulled coverage away and relieved 8 Pressure.`,
      );
      break;
    case "release-pressure":
      state.pressure = clamp(state.pressure - 6, 0, 100);
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} released 6 Pressure on exit.`,
      );
      break;
  }
}

function advancePlay(
  state: GameState,
  phase: PlayPhase,
  holderId: PlayerId,
  momentum: number,
  message: string,
): void {
  state.puck.phase = phase;
  state.puck.holderId = holderId;
  state.momentum += momentum;
  appendEvent(state, "PLAY_ADVANCED", `${message} +${momentum} Momentum.`);
}

function resolveEntryEffect(state: GameState, incomingId: PlayerId): void {
  const incoming = playerDefinition(incomingId);
  switch (incoming.entryEffect) {
    case "retrieve-puck":
      if (state.puck.phase === "loose-puck") {
        advancePlay(
          state,
          "controlled",
          incomingId,
          450,
          `${incoming.shortName} retrieved the loose puck.`,
        );
      } else {
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} arrived without a loose puck to retrieve.`,
        );
      }
      break;
    case "carry-puck":
      if (state.puck.phase === "controlled") {
        advancePlay(
          state,
          "zone-entry",
          incomingId,
          700,
          `${incoming.shortName} carried possession through the line.`,
        );
      } else {
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} could not carry an uncontrolled puck.`,
        );
      }
      break;
    case "create-seam":
      if (state.puck.phase === "controlled") {
        advancePlay(
          state,
          "zone-entry",
          incomingId,
          650,
          `${incoming.shortName} turned control into an entry.`,
        );
      } else if (state.puck.phase === "zone-entry") {
        advancePlay(
          state,
          "scoring-setup",
          incomingId,
          1_100,
          `${incoming.shortName} opened a scoring seam.`,
        );
      } else {
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} found no controlled entry to develop.`,
        );
      }
      break;
    case "finish-chance":
      if (state.puck.phase === "scoring-setup") {
        advancePlay(
          state,
          "shot-ready",
          incomingId,
          1_700,
          `${incoming.shortName} converted the setup into a shot.`,
        );
      } else {
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} entered before a scoring setup existed.`,
        );
      }
      break;
    case "absorb-pressure":
      state.pressure = clamp(state.pressure - 20, 0, 100);
      appendEvent(
        state,
        "ENTRY_EFFECT",
        `${incoming.shortName} absorbed 20 opponent Pressure.`,
      );
      break;
    case "break-forecheck":
      state.pressure = clamp(state.pressure - 28, 0, 100);
      appendEvent(
        state,
        "ENTRY_EFFECT",
        `${incoming.shortName} disrupted the forecheck for 28 Pressure.`,
      );
      break;
  }
}

function resolveOnIceSynergy(state: GameState): void {
  if (state.puck.phase === "zone-entry") {
    const playmakerId = activePlayerWithRole(state, "Playmaker");
    if (playmakerId) {
      advancePlay(
        state,
        "scoring-setup",
        playmakerId,
        1_100,
        `${playerDefinition(playmakerId).shortName} connected the entry to a setup.`,
      );
    }
  }

  if (state.puck.phase === "scoring-setup") {
    const sniperId = activePlayerWithRole(state, "Sniper");
    if (sniperId && state.active.finish === sniperId) {
      advancePlay(
        state,
        "shot-ready",
        sniperId,
        1_700,
        `${playerDefinition(sniperId).shortName} arrived in the finishing lane.`,
      );
    }
  }
}

function applyTurnover(state: GameState, message: string): void {
  state.lastShiftOutcome = "turnover";
  state.lastBankedAmount = 0;
  state.momentum = 0;
  state.status =
    state.shiftNumber >= state.maximumShifts ? "period-complete" : "turnover";
  state.dangerRemainingMs = null;
  appendEvent(state, "TURNOVER", message);
}

function checkFailure(state: GameState): void {
  if (state.pressure >= 100) {
    state.pressure = 100;
    applyTurnover(
      state,
      "Turnover: opponent Pressure reached 100. Unbanked Momentum was lost.",
    );
  }
}

function substitute(
  state: GameState,
  incomingId: PlayerId,
  slot: ActiveSlot,
): GameState {
  const next = cloneState(state);
  const benchIndex = next.bench.indexOf(incomingId);
  if (benchIndex < 0) {
    appendEvent(
      next,
      "RULE_REJECTED",
      "Substitution rejected: player is not on the bench.",
    );
    return next;
  }
  if (next.players[incomingId].reentryLockMs > 0) {
    appendEvent(
      next,
      "RULE_REJECTED",
      `${playerDefinition(incomingId).shortName} is still in re-entry lockout.`,
    );
    return next;
  }

  const outgoingId = next.active[slot];
  const outgoingHeldPuck = next.puck.holderId === outgoingId;
  next.puck.handoffProtected = false;
  resolveExitEffect(next, outgoingId);

  next.active[slot] = incomingId;
  next.bench[benchIndex] = outgoingId;
  next.players[outgoingId].reentryLockMs = REENTRY_LOCK_MS;
  next.players[incomingId].reentryLockMs = 0;
  next.pressure = clamp(next.pressure + SUBSTITUTION_PRESSURE, 0, 100);

  if (outgoingHeldPuck) {
    if (next.puck.handoffProtected) {
      next.puck.holderId = incomingId;
    } else {
      next.puck.holderId = null;
      next.puck.phase = "loose-puck";
      appendEvent(
        next,
        "PLAY_ADVANCED",
        "The outgoing puck carrier left without a protected handoff.",
      );
    }
  }

  appendEvent(
    next,
    "SUBSTITUTION",
    `${playerDefinition(incomingId).shortName} replaced ${playerDefinition(outgoingId).shortName} in ${slot.toUpperCase()}.`,
  );
  resolveEntryEffect(next, incomingId);
  resolveOnIceSynergy(next);
  next.puck.handoffProtected = false;

  const exhaustedActive = activeIds(next).some(
    (id) => next.players[id].stamina <= 0,
  );
  if (!exhaustedActive) next.dangerRemainingMs = null;
  checkFailure(next);
  assertValidState(next);
  return next;
}

function advanceClock(state: GameState, elapsedMs: number): GameState {
  const next = cloneState(state);
  const safeElapsed = clamp(elapsedMs, 0, 5_000);
  const seconds = safeElapsed / 1_000;
  next.elapsedMs += safeElapsed;

  for (const id of Object.keys(next.players)) {
    next.players[id].reentryLockMs = Math.max(
      0,
      next.players[id].reentryLockMs - safeElapsed,
    );
  }
  for (const id of activeIds(next)) {
    next.players[id].stamina = roundEngineValue(
      clamp(
        next.players[id].stamina - ACTIVE_STAMINA_DRAIN_PER_SECOND * seconds,
        0,
        playerDefinition(id).maxStamina,
      ),
    );
  }

  next.pressure = roundEngineValue(
    clamp(next.pressure + PRESSURE_GAIN_PER_SECOND * seconds, 0, 100),
  );
  next.momentum += Math.round(PHASE_DRIP_PER_SECOND[next.puck.phase] * seconds);
  appendEvent(next, "CLOCK_ADVANCED", `The play advanced ${safeElapsed} ms.`);

  if (next.pressure >= 100) {
    checkFailure(next);
    assertValidState(next);
    return next;
  }

  const exhaustedIds = activeIds(next).filter(
    (id) => next.players[id].stamina <= 0,
  );
  if (exhaustedIds.length > 0) {
    if (next.dangerRemainingMs === null) {
      next.dangerRemainingMs = DANGER_WINDOW_MS;
      appendEvent(
        next,
        "DANGER",
        `${playerDefinition(exhaustedIds[0]).shortName} is exhausted: 600 ms to substitute or shoot.`,
      );
    } else {
      next.dangerRemainingMs -= safeElapsed;
      if (next.dangerRemainingMs <= 0) {
        applyTurnover(
          next,
          `Turnover: ${playerDefinition(exhaustedIds[0]).shortName} exhausted before the line changed.`,
        );
      }
    }
  } else {
    next.dangerRemainingMs = null;
  }

  assertValidState(next);
  return next;
}

export function previewShot(state: GameState): ShotPreview {
  const quality = PHASE_QUALITY[state.puck.phase];
  const grossChance = Math.round(state.momentum * quality);
  const banked = Math.max(0, grossChance - state.goalieDefence);
  return {
    quality,
    grossChance,
    goalieDefence: state.goalieDefence,
    banked,
    formula: `${state.momentum.toLocaleString()} × ${quality.toFixed(2)} − ${state.goalieDefence.toLocaleString()} = ${banked.toLocaleString()}`,
  };
}

function shoot(state: GameState): GameState {
  const next = cloneState(state);
  const preview = previewShot(next);
  next.bankedMomentum += preview.banked;
  next.lastBankedAmount = preview.banked;
  next.lastShiftOutcome = "banked";
  next.momentum = 0;
  next.status =
    next.shiftNumber >= next.maximumShifts ? "period-complete" : "banked";
  next.dangerRemainingMs = null;
  appendEvent(
    next,
    "SHOT",
    `Shot banked ${preview.banked.toLocaleString()} Momentum (${preview.formula}).`,
  );
  assertValidState(next);
  return next;
}

function nextShift(state: GameState): GameState {
  if (state.status !== "banked" && state.status !== "turnover") return state;
  const next = cloneState(state);
  next.shiftNumber += 1;
  next.status = "playing";
  next.lastShiftOutcome = null;
  next.lastBankedAmount = 0;
  next.pressure = 0;
  next.momentum = 0;
  next.puck = {
    holderId: null,
    phase: "loose-puck",
    handoffProtected: false,
  };
  next.dangerRemainingMs = null;
  next.elapsedMs = 0;
  for (const [id, runtime] of Object.entries(next.players)) {
    runtime.stamina = playerDefinition(id).maxStamina;
    runtime.reentryLockMs = 0;
  }
  appendEvent(
    next,
    "SHIFT_STARTED",
    `Shift ${next.shiftNumber} started with a loose puck.`,
  );
  assertValidState(next);
  return next;
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  if (action.type === "RESTART") return createInitialGame();
  if (action.type === "NEXT_SHIFT") return nextShift(state);
  if (state.status !== "playing") return state;

  switch (action.type) {
    case "SUBSTITUTE":
      return substitute(state, action.incomingId, action.slot);
    case "ADVANCE_CLOCK":
      return advanceClock(state, action.elapsedMs);
    case "SHOOT":
      return shoot(state);
    default:
      return state;
  }
}

export function periodResult(state: GameState): "win" | "loss" | "in-progress" {
  if (state.status !== "period-complete") return "in-progress";
  return state.bankedMomentum >= state.periodTarget ? "win" : "loss";
}
