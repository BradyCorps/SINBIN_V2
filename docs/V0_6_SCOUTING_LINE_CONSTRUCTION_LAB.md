# V0.6 Scouting + Line Construction Lab

## Question under test

> When I see this opponent, do I want to build a different line—and can I feel
> that decision during the shift?

V0.6 tests roster construction around the existing deterministic formation and
counterattack loop. It does not add another opponent system, combat verb,
equipment layer, draft, progression track, timer, or Momentum target.

## Pre-match contract

- Show all three upcoming formations before lineup selection.
- Choose six ordered skaters from nine rectangle players.
- The first three selections fill Recover, Create, and Finish; the remaining
  three form the bench.
- Three fixed scout reports provide different known formation sequences.
- The match consists of exactly three shifts with goals for and against.

## Roster pool

The six V0.5 specialists remain available. Three hybrids test whether compressing
capabilities creates a meaningful alternative to peak specialist outcomes.

| Player | Capabilities        | Specialist trade-off                                               |
| ------ | ------------------- | ------------------------------------------------------------------ |
| Relay  | Carrier / Playmaker | Combines carry and route creation, but leaves the goalie set       |
| Brace  | Retriever / Grinder | Recovers and sustains; a hybrid clear returns a loose neutral puck |
| Spark  | Disruptor / Sniper  | Disrupts and can finish, but needs the fully developed opening     |

Flare now exposes the intended construction trade-off directly: the elite
specialist finish can convert a five-of-six opening, while Spark needs every
non-elite route factor. Defensive hybrids delay a route for one action instead
of producing the specialist's immediate takeaway or interception.

A substitution after possession is lost costs one counterattack route step, and
puck pressure cannot solve a terminal chance. Hatch on the bench is therefore
not a free eraser for leaving Flare in the active Finish slot.

## Match contract

Each resolved shift contributes only its hockey outcome:

- Goal adds one goal for.
- Goal against adds one goal against.
- Breakdown adds neither.
- The next known formation starts with the same selected six and original slot
  order.

After the third shift, the test reports win, loss, or draw. There is no arbitrary
score or Momentum target.

## Pass/fail observations

- Does the scout report cause players to remove at least one default specialist?
- Can they explain why Flare, Hatch, a second Carrier, or a crease-heavy group
  belongs against the shown sequence?
- Do they notice the hybrid's saved roster/action step and its weaker board
  result without reading source code?
- After the match, can they connect a goal or goal against to a pre-match slot?
- Do different scout reports produce meaningfully different six-player groups?

Pause before expanding the player pool if the default six solve every report,
hybrids dominate specialists, or the pre-match choice is not remembered during
the shift.
