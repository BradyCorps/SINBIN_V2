export const ACTIVE_SLOTS = ["recover", "create", "finish"] as const;
export type ActiveSlot = (typeof ACTIVE_SLOTS)[number];

export const LANES = ["left", "slot", "right"] as const;
export type Lane = (typeof LANES)[number];
export type CoverageState = "covered" | "pulled" | "pinned" | "open";
export type GoalieState = "set" | "moving" | "screened";

export type OpponentFormationId =
  "slot-collapse" | "wide-denial" | "high-press";

export type PlayerId = string;
export type PlayerRole =
  "Retriever" | "Carrier" | "Playmaker" | "Sniper" | "Grinder" | "Disruptor";

export type EntryEffectId =
  | "retrieve-puck"
  | "carry-puck"
  | "create-seam"
  | "finish-chance"
  | "absorb-pressure"
  | "break-forecheck";

export type ExitEffectId =
  | "protect-handoff"
  | "leave-lane"
  | "bank-setup"
  | "create-rebound"
  | "draw-coverage"
  | "release-pressure";

export interface StickDefinition {
  name: string;
  effect: string;
}

export interface PlayerDefinition {
  id: PlayerId;
  name: string;
  shortName: string;
  role: PlayerRole;
  maxStamina: number;
  entryEffect: EntryEffectId;
  exitEffect: ExitEffectId;
  stick: StickDefinition;
  accent: string;
}

export interface PlayerRuntime {
  stamina: number;
  reentryLockActions: number;
  discipline: number;
}

export interface PuckState {
  holderId: PlayerId | null;
  zone: "neutral" | "offensive";
  lane: Lane;
  state: "loose" | "controlled" | "chance";
  handoffProtected: boolean;
}

export interface DefenceState {
  coverage: Record<Lane, CoverageState>;
  forecheck: "active" | "broken";
  goalie: GoalieState;
}

export interface PenaltyState {
  playerId: PlayerId;
  actionsRemaining: number;
}

export type ShiftPhase = "attack" | "defend";

export interface CounterRouteStep {
  id: string;
  label: string;
  puckLane: Lane;
  predictedLane: Lane | null;
  threat: number;
  terminal: boolean;
}

export interface OpponentFormation {
  id: OpponentFormationId;
  label: string;
  weakPoint: string;
  initialPuckLane: Lane;
  initialDefence: DefenceState;
  carrierLane: Lane;
  playmakerLane: Lane;
  carrierCreatesChance: boolean;
  playmakerCanEnter: boolean;
  counterRoute: readonly CounterRouteStep[];
}

export interface CounterattackState {
  stepIndex: number;
  puckLane: Lane;
  contained: boolean;
}

export type ShiftStatus = "playing" | "goal" | "goal-against" | "breakdown";
export type ShiftOutcome = Exclude<ShiftStatus, "playing"> | null;

export interface ShotPreview {
  rating: number;
  result: "goal" | "save";
  factors: readonly { label: string; active: boolean }[];
  summary: string;
}

export interface GameEvent {
  id: number;
  type:
    | "SHIFT_STARTED"
    | "SUBSTITUTION"
    | "ENTRY_EFFECT"
    | "EXIT_EFFECT"
    | "ROUTE"
    | "DEFENCE_RESPONSE"
    | "PENALTY"
    | "TURNOVER"
    | "COUNTERATTACK"
    | "DEFENSIVE_STOP"
    | "SHOT"
    | "RESET"
    | "RULE_REJECTED";
  message: string;
}

export interface GameState {
  formationId: OpponentFormationId;
  active: Record<ActiveSlot, PlayerId>;
  bench: [PlayerId, PlayerId, PlayerId];
  players: Record<PlayerId, PlayerRuntime>;
  puck: PuckState;
  defence: DefenceState;
  phase: ShiftPhase;
  counterattack: CounterattackState | null;
  counterThreat: number;
  penalty: PenaltyState | null;
  status: ShiftStatus;
  lastShiftOutcome: ShiftOutcome;
  eventSequence: number;
  eventLog: GameEvent[];
}

export type GameAction =
  | { type: "SELECT_FORMATION"; formationId: OpponentFormationId }
  | { type: "SUBSTITUTE"; incomingId: PlayerId; slot: ActiveSlot }
  | { type: "CYCLE" }
  | { type: "RESET_PLAY" }
  | { type: "PRESSURE_PUCK" }
  | { type: "FORCE_WIDE" }
  | { type: "READ_PASS"; lane: Lane }
  | { type: "CLEAR_NET_FRONT" }
  | { type: "SHOOT" }
  | { type: "RESTART" };
