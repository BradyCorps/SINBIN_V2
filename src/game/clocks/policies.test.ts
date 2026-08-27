import { describe, expect, it } from "vitest";
import { LIVE_TICK_MS, liveTick, tacticalBeat } from "./policies";

describe("clock policies", () => {
  it("Tactical advances one deterministic play beat", () => {
    expect(tacticalBeat()).toEqual({
      type: "ADVANCE_CLOCK",
      elapsedMs: 1_000,
    });
  });

  it("Live emits bounded clock events without resolving game rules", () => {
    expect(liveTick()).toEqual({
      type: "ADVANCE_CLOCK",
      elapsedMs: LIVE_TICK_MS,
    });
    expect(liveTick(900)).toEqual({
      type: "ADVANCE_CLOCK",
      elapsedMs: 250,
    });
  });
});
