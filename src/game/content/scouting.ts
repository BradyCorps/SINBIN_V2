import type { OpponentFormationId } from "../core/types";

export type ScoutReportId = "wide-rush" | "crease-guard" | "mixed-test";

export interface ScoutReport {
  id: ScoutReportId;
  label: string;
  read: string;
  formations: readonly [
    OpponentFormationId,
    OpponentFormationId,
    OpponentFormationId,
  ];
}

export const SCOUT_REPORTS: Record<ScoutReportId, ScoutReport> = {
  "wide-rush": {
    id: "wide-rush",
    label: "Wing Rush",
    read: "Two middle-open shifts reward Carry / Create compression; the high press still demands a safe counter answer.",
    formations: ["wide-denial", "high-press", "wide-denial"],
  },
  "crease-guard": {
    id: "crease-guard",
    label: "Crease Guard",
    read: "Two slot collapses reward Retrieve / Grind compression; the closed-wing shift still needs a clean entry.",
    formations: ["slot-collapse", "wide-denial", "slot-collapse"],
  },
  "mixed-test": {
    id: "mixed-test",
    label: "Mixed Read",
    read: "All three formations appear once. Choose which specialist peak to keep and which paired role to compress.",
    formations: ["high-press", "slot-collapse", "wide-denial"],
  },
};
