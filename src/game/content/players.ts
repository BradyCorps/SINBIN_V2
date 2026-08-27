import type { ActiveSlot, PlayerDefinition, PlayerId } from "../core/types";

export const PLAYER_DEFINITIONS: Record<PlayerId, PlayerDefinition> = {
  ridge: {
    id: "ridge",
    name: "Ridge Mercer",
    shortName: "Ridge",
    role: "Grinder",
    maxStamina: 112,
    entryEffect: "absorb-pressure",
    exitEffect: "protect-handoff",
    stick: {
      name: "Sher-Wood Anchor",
      effect: "Protected handoffs relieve an extra 4 Pressure.",
    },
    accent: "#496b5c",
  },
  lane: {
    id: "lane",
    name: "Lane Sato",
    shortName: "Lane",
    role: "Playmaker",
    maxStamina: 96,
    entryEffect: "create-seam",
    exitEffect: "bank-setup",
    stick: {
      name: "Viper 95",
      effect: "A protected entry keeps the passing lane open.",
    },
    accent: "#f2c84b",
  },
  flare: {
    id: "flare",
    name: "Flare Kovac",
    shortName: "Flare",
    role: "Sniper",
    maxStamina: 84,
    entryEffect: "finish-chance",
    exitEffect: "draw-coverage",
    stick: {
      name: "Redline Curve",
      effect: "A one-timer created from a seam gains a cleaner release.",
    },
    accent: "#a64732",
  },
  rook: {
    id: "rook",
    name: "Rook Bell",
    shortName: "Rook",
    role: "Retriever",
    maxStamina: 106,
    entryEffect: "retrieve-puck",
    exitEffect: "protect-handoff",
    stick: {
      name: "Tape-to-Tape",
      effect: "The first protected retrieval keeps possession secure.",
    },
    accent: "#79afc1",
  },
  jet: {
    id: "jet",
    name: "Jet Larsson",
    shortName: "Jet",
    role: "Carrier",
    maxStamina: 92,
    entryEffect: "carry-puck",
    exitEffect: "leave-lane",
    stick: {
      name: "Jetstream",
      effect: "A protected carry opens the far-side lane.",
    },
    accent: "#d66b2c",
  },
  hatch: {
    id: "hatch",
    name: "Hatch Vale",
    shortName: "Hatch",
    role: "Disruptor",
    maxStamina: 102,
    entryEffect: "break-forecheck",
    exitEffect: "release-pressure",
    stick: {
      name: "Black Ice",
      effect: "Forecheck disruption buys the next line change room.",
    },
    accent: "#9d8060",
  },
};

export const INITIAL_ACTIVE: Record<ActiveSlot, PlayerId> = {
  recover: "ridge",
  create: "lane",
  finish: "flare",
};

export const INITIAL_BENCH: [PlayerId, PlayerId, PlayerId] = [
  "rook",
  "jet",
  "hatch",
];

export function playerDefinition(id: PlayerId): PlayerDefinition {
  const player = PLAYER_DEFINITIONS[id];
  if (!player) throw new Error(`Unknown player: ${id}`);
  return player;
}
