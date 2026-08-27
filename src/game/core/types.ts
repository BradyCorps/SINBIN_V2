export const ACTIVE_SLOTS = ["recover", "create", "finish"] as const;
export type ActiveSlot = (typeof ACTIVE_SLOTS)[number];

export type PlayerId = string;
export type LaneMode = "tactical" | "live";
export type PlayerRole =
  "Retriever" | "Carrier" | "Playmaker" | "Sniper" | "Grinder" | "Disruptor";

export type PlayPhase =
  "loose-puck" | "controlled" | "zone-entry" | "scoring-setup" | "shot-ready";

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

export interface PlayerDefinition {
  id: PlayerId;
  name: string;
  shortName: string;
  role: PlayerRole;
  secondaryRole?: PlayerRole;
  maxStamina: number;
  entryEffect: EntryEffectId;
  exitEffect: ExitEffectId;
  accent: string;
}

export interface PlayerRuntime {
  stamina: number;
  reentryLockMs: number;
}

export interface PuckState {
  holderId: PlayerId | null;
  phase: PlayPhase;
  handoffProtected: boolean;
}

export type ShiftStatus = "playing" | "banked" | "turnover" | "period-complete";

export type ShiftOutcome = "banked" | "turnover" | null;

export interface GameEvent {
  id: number;
  type:
    | "SHIFT_STARTED"
    | "CLOCK_ADVANCED"
    | "EXIT_EFFECT"
    | "SUBSTITUTION"
    | "ENTRY_EFFECT"
    | "PLAY_ADVANCED"
    | "DANGER"
    | "SHOT"
    | "TURNOVER"
    | "RULE_REJECTED";
  message: string;
}

export interface GameState {
  active: Record<ActiveSlot, PlayerId>;
  bench: [PlayerId, PlayerId, PlayerId];
  players: Record<PlayerId, PlayerRuntime>;
  puck: PuckState;
  pressure: number;
  momentum: number;
  bankedMomentum: number;
  goalieDefence: number;
  periodTarget: number;
  shiftNumber: number;
  maximumShifts: number;
  status: ShiftStatus;
  lastShiftOutcome: ShiftOutcome;
  lastBankedAmount: number;
  dangerRemainingMs: number | null;
  elapsedMs: number;
  eventSequence: number;
  eventLog: GameEvent[];
}

export type GameAction =
  | { type: "SUBSTITUTE"; incomingId: PlayerId; slot: ActiveSlot }
  | { type: "ADVANCE_CLOCK"; elapsedMs: number }
  | { type: "SHOOT" }
  | { type: "NEXT_SHIFT" }
  | { type: "RESTART" };

export interface ShotPreview {
  quality: number;
  grossChance: number;
  goalieDefence: number;
  banked: number;
  formula: string;
}
