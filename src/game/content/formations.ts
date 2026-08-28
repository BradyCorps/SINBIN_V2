import type { OpponentFormation, OpponentFormationId } from "../core/types";

export const DEFAULT_FORMATION_ID: OpponentFormationId = "slot-collapse";

export const OPPONENT_FORMATIONS: Record<
  OpponentFormationId,
  OpponentFormation
> = {
  "slot-collapse": {
    id: "slot-collapse",
    label: "Slot Collapse",
    weakPoint: "Wide lanes are available; the slot stays protected.",
    initialPuckLane: "left",
    initialDefence: {
      coverage: { left: "open", slot: "covered", right: "open" },
      forecheck: "active",
      goalie: "set",
    },
    carrierLane: "left",
    playmakerLane: "slot",
    carrierCreatesChance: false,
    playmakerCanEnter: false,
    counterRoute: [
      {
        id: "wide-rush",
        label: "Wide rush",
        puckLane: "left",
        predictedLane: "right",
        threat: 20,
        terminal: false,
      },
      {
        id: "net-front-feed",
        label: "Net-front feed",
        puckLane: "right",
        predictedLane: "slot",
        threat: 25,
        terminal: false,
      },
      {
        id: "crease-chance",
        label: "Crease chance",
        puckLane: "slot",
        predictedLane: null,
        threat: 30,
        terminal: true,
      },
    ],
  },
  "wide-denial": {
    id: "wide-denial",
    label: "Wide Denial",
    weakPoint: "Both wings are closed; the middle is available.",
    initialPuckLane: "slot",
    initialDefence: {
      coverage: { left: "covered", slot: "open", right: "covered" },
      forecheck: "active",
      goalie: "set",
    },
    carrierLane: "slot",
    playmakerLane: "slot",
    carrierCreatesChance: true,
    playmakerCanEnter: true,
    counterRoute: [
      {
        id: "middle-carry",
        label: "Middle carry",
        puckLane: "slot",
        predictedLane: "right",
        threat: 25,
        terminal: false,
      },
      {
        id: "far-post-pass",
        label: "Far-post chance",
        puckLane: "right",
        predictedLane: null,
        threat: 35,
        terminal: true,
      },
    ],
  },
  "high-press": {
    id: "high-press",
    label: "High Press",
    weakPoint: "Wide defenders are already pulled; possession is fragile.",
    initialPuckLane: "left",
    initialDefence: {
      coverage: { left: "pulled", slot: "covered", right: "pulled" },
      forecheck: "active",
      goalie: "set",
    },
    carrierLane: "right",
    playmakerLane: "right",
    carrierCreatesChance: true,
    playmakerCanEnter: false,
    counterRoute: [
      {
        id: "instant-cross-ice",
        label: "Instant cross-ice",
        puckLane: "left",
        predictedLane: "right",
        threat: 35,
        terminal: false,
      },
      {
        id: "far-side-chance",
        label: "Far-side chance",
        puckLane: "right",
        predictedLane: null,
        threat: 45,
        terminal: true,
      },
    ],
  },
};

export function formationDefinition(
  id: OpponentFormationId,
): OpponentFormation {
  return OPPONENT_FORMATIONS[id];
}
