import {
  INITIAL_ACTIVE,
  INITIAL_BENCH,
  PLAYER_DEFINITIONS,
  playerDefinition,
} from "../content/players";
import {
  ACTIVE_SLOTS,
  LANES,
  type ActiveSlot,
  type CoverageState,
  type GameAction,
  type GameEvent,
  type GameState,
  type Lane,
  type PlayerId,
  type PlayerRole,
  type ShotPreview,
} from "./types";

const MAX_COUNTER_THREAT = 100;
const FLARE_DISCIPLINE_PER_CYCLE = 50;
const PENALTY_ACTIONS = 2;

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function appendEvent(
  state: GameState,
  type: GameEvent["type"],
  message: string,
): void {
  state.eventSequence += 1;
  state.eventLog.push({ id: state.eventSequence, type, message });
  if (state.eventLog.length > 18) state.eventLog.shift();
}

function activeIds(state: GameState): PlayerId[] {
  return ACTIVE_SLOTS.map((slot) => state.active[slot]);
}

function activePlayerWithRole(
  state: GameState,
  role: PlayerRole,
): PlayerId | null {
  return (
    activeIds(state).find((id) => playerDefinition(id).role === role) ?? null
  );
}

function oppositeLane(lane: Lane): Lane {
  if (lane === "left") return "right";
  if (lane === "right") return "left";
  return "right";
}

function resetDefence(state: GameState): void {
  state.defence.coverage = {
    left: "covered",
    slot: "covered",
    right: "covered",
  };
  state.defence.forecheck = "active";
  state.defence.goalie = "set";
}

function advancePenalty(state: GameState): void {
  if (!state.penalty) return;
  state.penalty.actionsRemaining -= 1;
  if (state.penalty.actionsRemaining > 0) return;

  const player = playerDefinition(state.penalty.playerId);
  state.players[player.id].discipline = 0;
  state.penalty = null;
  appendEvent(state, "PENALTY", `${player.shortName} is back from the SINBIN.`);
}

function isPenalized(state: GameState, playerId: PlayerId): boolean {
  return state.penalty?.playerId === playerId;
}

function assertValidState(state: GameState): void {
  const roster = [...activeIds(state), ...state.bench];
  if (roster.length !== 6 || new Set(roster).size !== 6) {
    throw new Error("A SINBIN lineup must contain six unique players.");
  }
  if (state.puck.holderId && !activeIds(state).includes(state.puck.holderId)) {
    throw new Error("The puck holder must be on the ice.");
  }
  if (state.counterThreat < 0 || state.counterThreat > MAX_COUNTER_THREAT) {
    throw new Error("Counter threat must remain between 0 and 100.");
  }
  for (const lane of LANES) {
    if (!state.defence.coverage[lane]) {
      throw new Error(`Missing defensive coverage for ${lane}.`);
    }
  }
}

export function createInitialGame(): GameState {
  const players = Object.fromEntries(
    Object.values(PLAYER_DEFINITIONS).map((player) => [
      player.id,
      { stamina: player.maxStamina, reentryLockActions: 0, discipline: 0 },
    ]),
  );

  const state: GameState = {
    active: { ...INITIAL_ACTIVE },
    bench: [...INITIAL_BENCH],
    players,
    puck: {
      holderId: "rook",
      zone: "neutral",
      lane: "left",
      state: "controlled",
      handoffProtected: false,
    },
    defence: {
      coverage: { left: "covered", slot: "covered", right: "covered" },
      forecheck: "active",
      goalie: "set",
    },
    counterThreat: 0,
    penalty: null,
    status: "playing",
    lastShiftOutcome: null,
    eventSequence: 0,
    eventLog: [],
  };
  appendEvent(
    state,
    "SHIFT_STARTED",
    "Rook has controlled the puck in the neutral-zone left lane. The defence is set.",
  );
  assertValidState(state);
  return state;
}

function raiseThreat(state: GameState, amount: number, message: string): void {
  state.counterThreat = clamp(
    state.counterThreat + amount,
    0,
    MAX_COUNTER_THREAT,
  );
  appendEvent(state, "DEFENCE_RESPONSE", message);
  if (state.counterThreat >= MAX_COUNTER_THREAT) {
    state.status = "breakdown";
    state.lastShiftOutcome = "breakdown";
    appendEvent(
      state,
      "DEFENCE_RESPONSE",
      "Breakdown: the opponent countered before the play could finish.",
    );
  }
}

function resolveExitEffect(state: GameState, outgoingId: PlayerId): void {
  const outgoing = playerDefinition(outgoingId);
  switch (outgoing.role) {
    case "Retriever":
      state.puck.handoffProtected = true;
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} leaves a protected outlet for the next player.`,
      );
      break;
    case "Carrier":
      state.puck.handoffProtected = true;
      if (state.puck.zone === "offensive") {
        state.defence.coverage[state.puck.lane] = "open";
      }
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} leaves the lane open while changing.`,
      );
      break;
    case "Grinder":
      if (state.defence.goalie === "screened") state.defence.goalie = "moving";
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName}'s screen clears as they leave the ice.`,
      );
      break;
    case "Playmaker":
      state.puck.handoffProtected = true;
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} keeps the passing lane alive through the change.`,
      );
      break;
    case "Sniper":
      state.defence.coverage[state.puck.lane] =
        state.puck.zone === "offensive"
          ? "open"
          : state.defence.coverage[state.puck.lane];
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} drags their check out of the shooting lane.`,
      );
      break;
    case "Disruptor":
      state.counterThreat = clamp(
        state.counterThreat - 12,
        0,
        MAX_COUNTER_THREAT,
      );
      appendEvent(
        state,
        "EXIT_EFFECT",
        `${outgoing.shortName} releases counter pressure on exit.`,
      );
      break;
  }
}

function resolveEntryEffect(state: GameState, incomingId: PlayerId): void {
  const incoming = playerDefinition(incomingId);
  switch (incoming.role) {
    case "Retriever":
      if (state.puck.state === "loose") {
        state.puck.state = "controlled";
        state.puck.holderId = incomingId;
        state.defence.forecheck = "broken";
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} retrieves the loose puck and breaks the forecheck.`,
        );
      }
      break;
    case "Carrier":
      if (state.puck.state === "controlled" && state.puck.zone === "neutral") {
        state.puck.zone = "offensive";
        state.puck.holderId = incomingId;
        state.defence.coverage[state.puck.lane] = "pulled";
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} carries into the offensive zone and pulls the ${state.puck.lane} defender wide.`,
        );
      }
      break;
    case "Grinder":
      if (state.puck.zone === "offensive") {
        state.defence.coverage[state.puck.lane] = "pinned";
        state.defence.goalie = "screened";
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} pins the defender and screens the goalie.`,
        );
      }
      break;
    case "Disruptor":
      state.defence.forecheck = "broken";
      state.counterThreat = clamp(
        state.counterThreat - 20,
        0,
        MAX_COUNTER_THREAT,
      );
      appendEvent(
        state,
        "ENTRY_EFFECT",
        `${incoming.shortName} disrupts the forecheck and buys the line time.`,
      );
      break;
    case "Playmaker":
    case "Sniper":
      appendEvent(
        state,
        "ENTRY_EFFECT",
        `${incoming.shortName} is ready for the next route decision.`,
      );
      break;
  }
}

function substitute(
  state: GameState,
  incomingId: PlayerId,
  slot: ActiveSlot,
): GameState {
  const next = cloneState(state);
  const benchIndex = next.bench.indexOf(incomingId);
  if (benchIndex < 0 || isPenalized(next, incomingId)) {
    appendEvent(
      next,
      "RULE_REJECTED",
      "That player is unavailable from the bench.",
    );
    return next;
  }
  const outgoingId = next.active[slot];
  if (isPenalized(next, outgoingId)) {
    appendEvent(
      next,
      "RULE_REJECTED",
      `${playerDefinition(outgoingId).shortName} is in the SINBIN; that lane is short-handed.`,
    );
    return next;
  }
  if (next.players[incomingId].reentryLockActions > 0) {
    appendEvent(
      next,
      "RULE_REJECTED",
      `${playerDefinition(incomingId).shortName} needs one more play action before returning.`,
    );
    return next;
  }

  const outgoingHeldPuck = next.puck.holderId === outgoingId;
  next.puck.handoffProtected = false;
  resolveExitEffect(next, outgoingId);
  next.active[slot] = incomingId;
  next.bench[benchIndex] = outgoingId;
  next.players[outgoingId].reentryLockActions = 1;

  if (outgoingHeldPuck) {
    if (next.puck.handoffProtected) {
      next.puck.holderId = incomingId;
    } else {
      next.puck.state = "loose";
      next.puck.holderId = null;
      next.puck.zone = "neutral";
      resetDefence(next);
      appendEvent(
        next,
        "DEFENCE_RESPONSE",
        "The change lost the puck and the defence reset.",
      );
    }
  }

  appendEvent(
    next,
    "SUBSTITUTION",
    `${playerDefinition(incomingId).shortName} replaces ${playerDefinition(outgoingId).shortName} in ${slot.toUpperCase()}.`,
  );
  resolveEntryEffect(next, incomingId);
  next.puck.handoffProtected = false;
  assertValidState(next);
  return next;
}

function applyFlareDiscipline(state: GameState): void {
  const flareId = activeIds(state).find(
    (id) => playerDefinition(id).role === "Sniper",
  );
  if (!flareId || isPenalized(state, flareId)) return;
  const flare = state.players[flareId];
  flare.discipline = clamp(
    flare.discipline + FLARE_DISCIPLINE_PER_CYCLE,
    0,
    100,
  );
  if (flare.discipline < 100) return;
  state.penalty = { playerId: flareId, actionsRemaining: PENALTY_ACTIONS };
  appendEvent(
    state,
    "PENALTY",
    `${playerDefinition(flareId).shortName} took a penalty. Finish is short-handed for ${PENALTY_ACTIONS} actions.`,
  );
}

function completeAction(state: GameState): void {
  for (const runtime of Object.values(state.players)) {
    runtime.reentryLockActions = Math.max(0, runtime.reentryLockActions - 1);
  }
  advancePenalty(state);
}

function cycle(state: GameState): GameState {
  const next = cloneState(state);
  if (next.puck.state === "loose" || next.puck.zone !== "offensive") {
    appendEvent(
      next,
      "RULE_REJECTED",
      "Cycle requires controlled offensive-zone possession.",
    );
    return next;
  }
  const playmakerId = activePlayerWithRole(next, "Playmaker");
  if (!playmakerId || isPenalized(next, playmakerId)) {
    raiseThreat(
      next,
      18,
      "The defence closes: no Playmaker is available for the cycle.",
    );
    return next;
  }

  if (next.puck.state === "chance") {
    resetDefence(next);
    next.puck.state = "controlled";
    raiseThreat(
      next,
      20,
      "The defence recovered its shape while the play was extended.",
    );
    applyFlareDiscipline(next);
    completeAction(next);
    assertValidState(next);
    return next;
  }

  const previousLane = next.puck.lane;
  const targetLane = oppositeLane(previousLane);
  next.puck.lane = targetLane;
  next.puck.holderId = playmakerId;
  next.puck.state = "chance";
  next.defence.coverage[previousLane] = "open";
  next.defence.coverage[targetLane] = "pulled";
  next.defence.goalie = "moving";
  raiseThreat(
    next,
    12,
    `${playerDefinition(playmakerId).shortName} sends a cross-ice pass: the goalie is moving and the ${targetLane} defender is pulled out.`,
  );
  applyFlareDiscipline(next);
  completeAction(next);
  assertValidState(next);
  return next;
}

function resetPlay(state: GameState): GameState {
  const next = cloneState(state);
  next.puck = {
    holderId: activePlayerWithRole(next, "Retriever"),
    zone: "neutral",
    lane: "left",
    state: activePlayerWithRole(next, "Retriever") ? "controlled" : "loose",
    handoffProtected: false,
  };
  resetDefence(next);
  next.counterThreat = clamp(next.counterThreat - 18, 0, MAX_COUNTER_THREAT);
  appendEvent(
    next,
    "RESET",
    "The line resets to a safe neutral-zone shape. The defence is set again.",
  );
  completeAction(next);
  assertValidState(next);
  return next;
}

export function previewShot(state: GameState): ShotPreview {
  const sniperId = activePlayerWithRole(state, "Sniper");
  const factors = [
    {
      label: "Offensive-zone possession",
      active: state.puck.zone === "offensive",
    },
    {
      label: "Shooting lane not covered",
      active: state.defence.coverage[state.puck.lane] !== "covered",
    },
    {
      label: "Goalie moving or screened",
      active: state.defence.goalie !== "set",
    },
    { label: "Net-front screen", active: state.defence.goalie === "screened" },
    {
      label: "Sniper available in Finish",
      active: sniperId !== null && !isPenalized(state, sniperId),
    },
  ] as const;
  const rating = factors.filter((factor) => factor.active).length;
  const result = rating >= 5 ? "goal" : "save";
  return {
    rating,
    result,
    factors,
    summary:
      result === "goal"
        ? "The route has fully exposed the net. SHOOT scores."
        : `The goalie still has the read. You need ${5 - rating} more opening${5 - rating === 1 ? "" : "s"} before this shot beats them.`,
  };
}

function shoot(state: GameState): GameState {
  const next = cloneState(state);
  const preview = previewShot(next);
  next.status = preview.result;
  next.lastShiftOutcome = preview.result;
  appendEvent(
    next,
    "SHOT",
    preview.result === "goal"
      ? "GOAL: the exposed lane, moving goalie, screen, and finish all connected."
      : "SAVE: the goalie still had enough structure in front of them.",
  );
  assertValidState(next);
  return next;
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  if (action.type === "RESTART") return createInitialGame();
  if (state.status !== "playing") return state;
  switch (action.type) {
    case "SUBSTITUTE":
      return substitute(state, action.incomingId, action.slot);
    case "CYCLE":
      return cycle(state);
    case "RESET_PLAY":
      return resetPlay(state);
    case "SHOOT":
      return shoot(state);
  }
}

export function coverageLabel(value: CoverageState): string {
  return value === "covered"
    ? "Covered"
    : value[0].toUpperCase() + value.slice(1);
}
