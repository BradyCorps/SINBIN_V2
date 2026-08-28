# Mechanics Reference

**Status:** V0.5 formation-variety rectangle gate. All states and routes are
deliberate deterministic fixtures, not production balance or authentic NHL
system labels.

## Shift shape

- Six players: three active, three on the bench.
- Active slots: Recover, Create, Finish.
- One deterministic shift; no timer, passive Momentum, stick rules, drafting,
  progression, or random outcomes.
- A shift moves between **Attack** and **Defend**. A goal, goal against, or dead
  shot ends the test.
- The selected formation is preserved when the shift restarts or resets.

## Opponent formations

| Formation     | Starting coverage                   | Attack read                                                                              | Counterattack                              |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| Slot Collapse | Wide lanes Open; slot Covered       | Build wide, then use a Playmaker to pull inside or a Disruptor to sustain the wide route | Wide rush → net-front feed → crease chance |
| Wide Denial   | Wings Covered; slot Open            | Carrier or Playmaker can enter through the middle                                        | Middle carry → far-post chance             |
| High Press    | Wide defenders Pulled; slot Covered | Carrier creates a fast wide chance; a direct Playmaker entry is denied                   | Instant cross-ice → far-side chance        |

Every formation definition owns its visible initial coverage, goalie state,
named weak point, role lanes, and ordered counterattack steps. The engine applies
the same actions and rules to all three definitions.

## Attack

- Carrier entry advances through the formation's available lane.
- Playmaker cycle targets the formation's route lane. Wide Denial also permits a
  direct Playmaker entry through its open middle.
- Disruptor entry can turn controlled offensive possession into a same-lane
  chance by breaking the active shape.
- Grinder entry pins and screens only after a **Chance** has been developed.
  Merely reaching the offensive zone is not enough.
- SHOOT retains the transparent five-factor deterministic read. All five factors
  score; an incomplete shot is saved and ends the test.
- Extending an existing chance creates the selected formation's counterattack.

## Defence

| Defensive action | Requirement                                                     | Board result                                           |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| Pressure puck    | Grinder or Disruptor active                                     | Immediate takeaway and neutral reset                   |
| Force wide       | Carrier active; once per counterattack                          | Moves a middle puck wide and buys one defensive action |
| Read pass        | Playmaker active and chosen lane matches the visible prediction | Interception and neutral reset                         |
| Clear chance     | Grinder or Retriever active at a terminal route step            | Clears the live chance and resets to neutral           |

A wrong lane read, unavailable role response, repeated contain, or uncleared
terminal chance advances the deterministic route. Advancing beyond its terminal
step is a goal against. Sniper has no independent defensive response.

Defensive substitutions use defensive role descriptions only; they never apply
offensive puck-entry effects while the opponent has possession.
