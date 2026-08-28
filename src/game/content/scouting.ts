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
    read: "Two shifts expose wide defenders; the counter comes back quickly.",
    formations: ["wide-denial", "high-press", "wide-denial"],
  },
  "crease-guard": {
    id: "crease-guard",
    label: "Crease Guard",
    read: "Two slot collapses reward patient routes and crease recovery.",
    formations: ["slot-collapse", "wide-denial", "slot-collapse"],
  },
  "mixed-test": {
    id: "mixed-test",
    label: "Mixed Read",
    read: "All three rectangle formations appear once.",
    formations: ["high-press", "slot-collapse", "wide-denial"],
  },
};
