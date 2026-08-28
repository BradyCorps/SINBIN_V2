import {
  INITIAL_ACTIVE,
  INITIAL_BENCH,
  PLAYER_DEFINITIONS,
  playerDefinition,
  playerHasRole,
} from "../content/players";
import {
  DEFAULT_FORMATION_ID,
  formationDefinition,
} from "../content/formations";
import {
  ACTIVE_SLOTS,
  LANES,
  type ActiveSlot,
  type CoverageState,
  type GameAction,
  type GameEvent,
  type GameState,
  type Lane,
  type LineupDefinition,
  type OpponentFormationId,
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
  return activeIds(state).find((id) => playerHasRole(id, role)) ?? null;
}

function activeHasSpecialistRole(
  state: GameState,
  ...roles: PlayerRole[]
): boolean {
  return activeIds(state).some((id) => {
    const player = playerDefinition(id);
    return (
      !isPenalized(state, id) &&
      !player.secondaryRole &&
      roles.includes(player.role)
    );
  });
}

function resetDefence(state: GameState): void {
  state.defence = structuredClone(
    formationDefinition(state.formationId).initialDefence,
  );
}

function returnToNeutral(state: GameState, message: string): void {
  const retrieverId = activePlayerWithRole(state, "Retriever");
  const formation = formationDefinition(state.formationId);
  state.phase = "attack";
  state.counterattack = null;
  state.puck = {
    holderId: retrieverId,
    zone: "neutral",
    lane: formation.initialPuckLane,
    state: retrieverId ? "controlled" : "loose",
    handoffProtected: false,
  };
  resetDefence(state);
  state.counterThreat = 0;
  appendEvent(state, "DEFENSIVE_STOP", message);
}

function startCounterattack(state: GameState, reason: string): void {
  const formation = formationDefinition(state.formationId);
  const opening = formation.counterRoute[0];
  state.phase = "defend";
  state.counterattack = {
    stepIndex: 0,
    puckLane: opening.puckLane,
    contained: false,
  };
  state.puck = {
    holderId: null,
    zone: "neutral",
    lane: opening.puckLane,
    state: "loose",
    handoffProtected: false,
  };
  state.counterThreat = clamp(
    state.counterThreat + opening.threat,
    0,
    MAX_COUNTER_THREAT,
  );
  appendEvent(
    state,
    "TURNOVER",
    `${reason} ${formation.label} starts ${opening.label} in the ${opening.puckLane} lane.`,
  );
}

function activeHasRole(state: GameState, ...roles: PlayerRole[]): boolean {
  return activeIds(state).some(
    (id) =>
      !isPenalized(state, id) && roles.some((role) => playerHasRole(id, role)),
  );
}

function concedeCounterattack(state: GameState): void {
  const step = currentCounterStep(state);
  state.status = "goal-against";
  state.lastShiftOutcome = "goal-against";
  appendEvent(
    state,
    "COUNTERATTACK",
    `GOAL AGAINST: ${step?.label.toLowerCase() ?? "the counterattack"} was not stopped in time.`,
  );
}

function currentCounterStep(state: GameState) {
  if (!state.counterattack) return null;
  return formationDefinition(state.formationId).counterRoute[
    state.counterattack.stepIndex
  ];
}

function advanceCounterattack(state: GameState): void {
  const attack = state.counterattack;
  if (!attack) return;
  const route = formationDefinition(state.formationId).counterRoute;
  const current = route[attack.stepIndex];
  if (current.terminal || attack.stepIndex === route.length - 1) {
    concedeCounterattack(state);
    return;
  }

  attack.stepIndex += 1;
  const nextStep = route[attack.stepIndex];
  attack.puckLane = nextStep.puckLane;
  state.counterThreat = clamp(
    state.counterThreat + nextStep.threat,
    0,
    MAX_COUNTER_THREAT,
  );
  appendEvent(
    state,
    "COUNTERATTACK",
    `${nextStep.label}: the opponent moves the puck to the ${nextStep.puckLane} lane.${nextStep.predictedLane ? ` The ${nextStep.predictedLane} lane is next.` : " Stop the live chance now."}`,
  );
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
  if (state.phase === "defend" && !state.counterattack) {
    throw new Error("Defend phase requires an active counterattack.");
  }
  if (state.phase === "attack" && state.counterattack) {
    throw new Error("Attack phase cannot retain a counterattack.");
  }
  if (
    state.counterattack &&
    !formationDefinition(state.formationId).counterRoute[
      state.counterattack.stepIndex
    ]
  ) {
    throw new Error("Counterattack step must belong to the active formation.");
  }
}

export function createInitialGame(
  formationId: OpponentFormationId = DEFAULT_FORMATION_ID,
  lineup: LineupDefinition = {
    active: INITIAL_ACTIVE,
    bench: INITIAL_BENCH,
  },
): GameState {
  const formation = formationDefinition(formationId);
  const players = Object.fromEntries(
    Object.values(PLAYER_DEFINITIONS).map((player) => [
      player.id,
      { stamina: player.maxStamina, reentryLockActions: 0, discipline: 0 },
    ]),
  );

  const state: GameState = {
    formationId,
    startingLineup: structuredClone(lineup),
    active: { ...lineup.active },
    bench: [...lineup.bench],
    players,
    puck: {
      holderId: lineup.active.recover,
      zone: "neutral",
      lane: formation.initialPuckLane,
      state: "controlled",
      handoffProtected: false,
    },
    defence: structuredClone(formation.initialDefence),
    phase: "attack",
    counterattack: null,
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
    `${formation.label}: ${formation.weakPoint} ${playerDefinition(lineup.active.recover).shortName} controls the ${formation.initialPuckLane} lane in neutral ice.`,
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
  const formation = formationDefinition(state.formationId);
  if (
    incoming.hybridEffect === "carry-create" &&
    state.puck.state === "controlled" &&
    state.puck.zone === "neutral"
  ) {
    state.puck = {
      ...state.puck,
      holderId: incomingId,
      zone: "offensive",
      lane: formation.carrierLane,
      state: "chance",
    };
    state.defence.coverage[formation.carrierLane] = "pulled";
    appendEvent(
      state,
      "ENTRY_EFFECT",
      `${incoming.shortName} combines the carry and route creation in the ${formation.carrierLane} lane, but the goalie stays set.`,
    );
    return;
  }
  if (
    incoming.hybridEffect === "retrieve-sustain" &&
    state.puck.zone === "offensive" &&
    state.puck.state === "chance"
  ) {
    state.defence.coverage[state.puck.lane] = "pinned";
    appendEvent(
      state,
      "ENTRY_EFFECT",
      `${incoming.shortName} sustains the chance and pins the defender, but cannot fully screen the goalie.`,
    );
    return;
  }
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
        state.puck.lane = formation.carrierLane;
        state.puck.holderId = incomingId;
        state.defence.coverage[state.puck.lane] = "pulled";
        if (formation.carrierCreatesChance) {
          state.puck.state = "chance";
          state.defence.goalie = "moving";
        }
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} carries through ${formation.label}'s weak point into the ${state.puck.lane} lane and pulls its defender.${formation.carrierCreatesChance ? " The fast entry creates an immediate chance." : ""}`,
        );
      }
      break;
    case "Grinder":
      if (
        !incoming.secondaryRole &&
        state.puck.zone === "offensive" &&
        state.puck.state === "chance"
      ) {
        state.defence.coverage[state.puck.lane] = "pinned";
        state.defence.goalie = "screened";
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} pins the defender and screens the goalie.`,
        );
      } else {
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} arrives at the net, but the route is not developed enough to hold a screen.`,
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
      if (
        state.puck.zone === "offensive" &&
        state.puck.state === "controlled"
      ) {
        state.puck.state = "chance";
        state.defence.coverage[state.puck.lane] = "open";
        state.defence.goalie = "moving";
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} breaks the active shape in the ${state.puck.lane} lane and turns possession into a chance.`,
        );
      } else {
        appendEvent(
          state,
          "ENTRY_EFFECT",
          `${incoming.shortName} disrupts the forecheck and buys the line time.`,
        );
      }
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

function describeDefensiveEntry(state: GameState, incomingId: PlayerId): void {
  const incoming = playerDefinition(incomingId);
  const response = incoming.secondaryRole
    ? "can cover two responses, but only delays the route as a hybrid"
    : incoming.role === "Carrier"
      ? "is available to force the puck carrier wide"
      : incoming.role === "Playmaker"
        ? "can read the predicted passing lane"
        : incoming.role === "Retriever"
          ? "is available to clear a terminal chance"
          : incoming.role === "Grinder"
            ? "can pressure the puck or clear a terminal chance"
            : incoming.role === "Disruptor"
              ? "is available for an immediate strip"
              : "must rely on the rest of the line defensively";
  appendEvent(state, "ENTRY_EFFECT", `${incoming.shortName} ${response}.`);
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

  const attacking = next.phase === "attack";
  const outgoingHeldPuck = attacking && next.puck.holderId === outgoingId;
  next.puck.handoffProtected = false;
  if (attacking) resolveExitEffect(next, outgoingId);
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
  if (attacking) resolveEntryEffect(next, incomingId);
  else {
    describeDefensiveEntry(next, incomingId);
    appendEvent(
      next,
      "COUNTERATTACK",
      "The defensive change costs one route step while the opponent keeps possession.",
    );
    advanceCounterattack(next);
    completeAction(next);
  }
  next.puck.handoffProtected = false;
  assertValidState(next);
  return next;
}

function applyFlareDiscipline(state: GameState): void {
  const flareId = activeIds(state).find((id) => {
    const player = playerDefinition(id);
    return player.role === "Sniper" && !player.secondaryRole;
  });
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
  const formation = formationDefinition(next.formationId);
  if (next.phase !== "attack") {
    appendEvent(
      next,
      "RULE_REJECTED",
      "You cannot cycle while the opponent has possession.",
    );
    return next;
  }
  if (next.puck.state === "loose") {
    appendEvent(next, "RULE_REJECTED", "Cycle requires controlled possession.");
    return next;
  }
  if (next.puck.state === "chance") {
    startCounterattack(
      next,
      "TURNOVER: the extra cycle was read and the defence recovered the puck.",
    );
    completeAction(next);
    assertValidState(next);
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

  if (next.puck.zone === "neutral") {
    if (!formation.playmakerCanEnter) {
      raiseThreat(
        next,
        12,
        `${formation.label} denies a direct Playmaker entry; the puck remains in neutral ice.`,
      );
      completeAction(next);
      assertValidState(next);
      return next;
    }
    next.puck.zone = "offensive";
    next.puck.lane = formation.playmakerLane;
    next.puck.holderId = playmakerId;
    next.puck.state = "chance";
    next.defence.coverage[formation.playmakerLane] = "pulled";
    const hybridPlaymaker = Boolean(
      playerDefinition(playmakerId).secondaryRole,
    );
    if (!hybridPlaymaker) next.defence.goalie = "moving";
    raiseThreat(
      next,
      12,
      hybridPlaymaker
        ? `${playerDefinition(playmakerId).shortName} compresses the middle entry into one action, but the goalie stays set.`
        : `${playerDefinition(playmakerId).shortName} reads the open middle and creates a chance through the ${formation.playmakerLane} lane.`,
    );
    applyFlareDiscipline(next);
    completeAction(next);
    assertValidState(next);
    return next;
  }

  const previousLane = next.puck.lane;
  const targetLane = formation.playmakerLane;
  next.puck.lane = targetLane;
  next.puck.holderId = playmakerId;
  next.puck.state = "chance";
  next.defence.coverage[previousLane] = "open";
  next.defence.coverage[targetLane] = "pulled";
  const hybridPlaymaker = Boolean(playerDefinition(playmakerId).secondaryRole);
  if (!hybridPlaymaker) next.defence.goalie = "moving";
  raiseThreat(
    next,
    12,
    hybridPlaymaker
      ? `${playerDefinition(playmakerId).shortName} creates the ${targetLane} route, but cannot move the goalie like a specialist.`
      : `${playerDefinition(playmakerId).shortName} sends a cross-ice pass: the goalie is moving and the ${targetLane} defender is pulled out.`,
  );
  applyFlareDiscipline(next);
  completeAction(next);
  assertValidState(next);
  return next;
}

function resetPlay(state: GameState): GameState {
  const next = cloneState(state);
  const formation = formationDefinition(next.formationId);
  if (next.phase !== "attack") {
    appendEvent(
      next,
      "RULE_REJECTED",
      "Protect and reset are unavailable during a counterattack.",
    );
    return next;
  }
  next.puck = {
    holderId: activePlayerWithRole(next, "Retriever"),
    zone: "neutral",
    lane: formation.initialPuckLane,
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

function pressurePuck(state: GameState): GameState {
  const next = cloneState(state);
  if (next.phase !== "defend" || !next.counterattack) {
    appendEvent(
      next,
      "RULE_REJECTED",
      "Pressure is only available while defending a counterattack.",
    );
    return next;
  }
  if (currentCounterStep(next)?.terminal) {
    appendEvent(
      next,
      "COUNTERATTACK",
      "Puck pressure is too late at the terminal chance; only a crease clear can recover.",
    );
    advanceCounterattack(next);
    completeAction(next);
    assertValidState(next);
    return next;
  }
  if (activeHasSpecialistRole(next, "Disruptor", "Grinder")) {
    returnToNeutral(
      next,
      "TAKEAWAY: your defensive specialist stripped the puck carrier before the pass.",
    );
  } else if (
    activeHasRole(next, "Disruptor", "Grinder") &&
    !next.counterattack.contained
  ) {
    next.counterattack.contained = true;
    appendEvent(
      next,
      "COUNTERATTACK",
      "HYBRID PRESSURE: the route is slowed for one action, but the puck is not won.",
    );
  } else {
    appendEvent(
      next,
      "COUNTERATTACK",
      "No Grinder or Disruptor can win the puck pressure. The counterattack advances.",
    );
    advanceCounterattack(next);
  }
  completeAction(next);
  assertValidState(next);
  return next;
}

function forceWide(state: GameState): GameState {
  const next = cloneState(state);
  if (next.phase !== "defend" || !next.counterattack) {
    appendEvent(
      next,
      "RULE_REJECTED",
      "Contain is only available while defending a counterattack.",
    );
    return next;
  }
  if (!activeHasRole(next, "Carrier") || next.counterattack.contained) {
    appendEvent(
      next,
      "COUNTERATTACK",
      next.counterattack.contained
        ? "The carrier has already been forced wide once. The counterattack finds its next route."
        : "No Carrier can contain the puck carrier. The counterattack advances.",
    );
    advanceCounterattack(next);
    completeAction(next);
    assertValidState(next);
    return next;
  }
  next.counterattack.contained = true;
  if (next.counterattack.puckLane === "slot") {
    next.counterattack.puckLane = "left";
  }
  appendEvent(
    next,
    "COUNTERATTACK",
    `CONTAIN: the Carrier forces the puck wide to the ${next.counterattack.puckLane} lane and buys one defensive action.`,
  );
  completeAction(next);
  assertValidState(next);
  return next;
}

function readPass(state: GameState, lane: Lane): GameState {
  const next = cloneState(state);
  if (next.phase !== "defend" || !next.counterattack) {
    appendEvent(
      next,
      "RULE_REJECTED",
      "Read a pass only while defending a counterattack.",
    );
    return next;
  }
  const step = currentCounterStep(next);
  if (
    activeHasSpecialistRole(next, "Playmaker") &&
    step?.predictedLane === lane
  ) {
    returnToNeutral(
      next,
      `INTERCEPTION: the Playmaker read the ${lane} passing lane before the puck arrived.`,
    );
  } else if (
    activeHasRole(next, "Playmaker") &&
    step?.predictedLane === lane &&
    !next.counterattack.contained
  ) {
    next.counterattack.contained = true;
    appendEvent(
      next,
      "COUNTERATTACK",
      `HYBRID READ: the ${lane} route is delayed for one action, but not intercepted.`,
    );
  } else {
    appendEvent(
      next,
      "COUNTERATTACK",
      !activeHasRole(next, "Playmaker")
        ? "No Playmaker can read the passing lane. The counterattack advances."
        : `The Playmaker closed ${lane}, but the route pointed ${step?.predictedLane ?? "at the net"}. The counterattack advances.`,
    );
    advanceCounterattack(next);
  }
  completeAction(next);
  assertValidState(next);
  return next;
}

function clearNetFront(state: GameState): GameState {
  const next = cloneState(state);
  const step = currentCounterStep(next);
  if (next.phase !== "defend" || !step?.terminal) {
    appendEvent(
      next,
      "RULE_REJECTED",
      "Clear the crease only when the net-front chance is live.",
    );
    return next;
  }
  if (activeHasRole(next, "Grinder", "Retriever")) {
    if (activeHasSpecialistRole(next, "Grinder", "Retriever")) {
      returnToNeutral(
        next,
        "CLEAR: the specialist wins the crease battle and moves the puck to neutral ice.",
      );
    } else {
      next.phase = "attack";
      next.counterattack = null;
      next.puck = {
        holderId: null,
        zone: "neutral",
        lane: formationDefinition(next.formationId).initialPuckLane,
        state: "loose",
        handoffProtected: false,
      };
      resetDefence(next);
      next.counterThreat = 0;
      appendEvent(
        next,
        "DEFENSIVE_STOP",
        "HYBRID CLEAR: the chance is stopped, but the puck returns loose in neutral ice.",
      );
    }
  } else {
    concedeCounterattack(next);
  }
  completeAction(next);
  assertValidState(next);
  return next;
}

export function previewShot(state: GameState): ShotPreview {
  const sniperId = activeIds(state).find(
    (id) => playerHasRole(id, "Sniper") && !isPenalized(state, id),
  );
  const eliteSniperId = activeIds(state).find((id) => {
    const player = playerDefinition(id);
    return (
      player.role === "Sniper" &&
      !player.secondaryRole &&
      !isPenalized(state, id)
    );
  });
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
      label: "Finisher available",
      active: sniperId !== undefined,
    },
    { label: "Elite specialist finish", active: eliteSniperId !== undefined },
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
  if (next.phase !== "attack") {
    appendEvent(
      next,
      "RULE_REJECTED",
      "You cannot shoot while defending a counterattack.",
    );
    return next;
  }
  const preview = previewShot(next);
  next.status = preview.result === "goal" ? "goal" : "breakdown";
  next.lastShiftOutcome = next.status;
  appendEvent(
    next,
    "SHOT",
    preview.result === "goal"
      ? "GOAL: the visible route and available finish fully exposed the net."
      : "SAVE: the goalie still had enough structure in front of them. The play is dead.",
  );
  assertValidState(next);
  return next;
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  if (action.type === "SELECT_FORMATION") {
    return createInitialGame(action.formationId, state.startingLineup);
  }
  if (action.type === "RESTART") {
    return createInitialGame(state.formationId, state.startingLineup);
  }
  if (state.status !== "playing") return state;
  switch (action.type) {
    case "SUBSTITUTE":
      return substitute(state, action.incomingId, action.slot);
    case "CYCLE":
      return cycle(state);
    case "RESET_PLAY":
      return resetPlay(state);
    case "PRESSURE_PUCK":
      return pressurePuck(state);
    case "FORCE_WIDE":
      return forceWide(state);
    case "READ_PASS":
      return readPass(state, action.lane);
    case "CLEAR_NET_FRONT":
      return clearNetFront(state);
    case "SHOOT":
      return shoot(state);
  }
}

export function coverageLabel(value: CoverageState): string {
  return value === "covered"
    ? "Covered"
    : value[0].toUpperCase() + value.slice(1);
}
