# Mechanics Reference

**Status:** V0.4 rectangle gate. All values and routes are deliberate test
fixtures, not production balance.

## Shift shape

- Six players: three active, three on the bench.
- Active slots: Recover, Create, Finish.
- One deterministic shift; no passive Momentum, score target, timer, Coach Lab,
  stick rules, drafting, or progression.
- A shift moves between **Attack** and **Defend**. A goal, goal against, or dead
  shot ends the test.

## Attack

The first route remains:

```text
Jet entry → Lane cross-ice cycle → Ridge screen → Flare finish
```

Each step changes a visible opponent lane or goalie state. A shot has five
transparent factors and is deterministic: all five produce a goal; an incomplete
route is a save/dead play.

## Turnover and counterattack

Extending an existing chance is a turnover, not passive value farming. The AI
receives the puck and runs one readable route:

```text
Left-lane carry → cross-ice right pass → slot / net-front chance
```

The player can use the same active line and bench to respond:

| Defensive action | Requirement                 | Result                                   |
| ---------------- | --------------------------- | ---------------------------------------- |
| Pressure puck    | Grinder or Disruptor active | Immediate takeaway; puck returns neutral |
| Close right      | A non-Sniper active         | Intercepts the first cross-ice pass      |
| Close slot       | A non-Sniper active         | Intercepts the net-front feed            |
| Clear net front  | Grinder or Retriever active | Clears the final crease chance           |

A failed pressure advances the AI route. Closing the wrong lane also advances
the route. Failing to clear the net-front chance is a goal against.

## Role liability

Flare is a strong finishing specialist but cannot pressure the puck or close a
passing lane alone. During a turnover, the player must decide whether the
offensive upside of leaving Flare out is worth a weaker defensive response.

Discipline is displayed in the lab but the complete short-handed penalty system
is intentionally deferred. V0.4 proves the underlying defensive liability first.
