# V0.3 Defensive-Structure Rectangle Lab

## Question under test

Can a player read a defensive shape, change the line to route the puck through
that shape, and choose to shoot or extend for a concrete hockey reason—before
art, progression, score targets, or real-time pressure are involved?

## Single-shift contract

- One deterministic shift; no five-shift target and no passive Momentum.
- Three active players and three bench players.
- Three visible lanes: left, slot, right.
- Each lane has a defender with a readable state: Covered, Pulled, Pinned, or
  Open.
- The goalie is visibly Set, Moving, or Screened.
- A five-factor shot read deterministically reports Goal or Save.
- CYCLE is a deliberate extension: it creates a cross-ice chance once, then
  lets the defence recover and raises counter threat if repeated.
- Flare gains 50 Discipline on every extended cycle. At 100, Flare takes a
  two-action SINBIN penalty and Finish is short-handed.

## Designed route

1. Change Jet in for Rook. Jet carries the puck into the offensive zone and
   pulls the left defender.
2. Cycle with Lane. The puck crosses to the right lane, the left lane opens,
   the right defender is pulled, and the goalie moves.
3. Change Ridge in for Jet. Ridge pins the defender and screens the goalie.
4. Shoot. All five shot factors are active: the result is a deterministic goal.

## What to observe in a test

- Does the player say which defender moved and why before reading the log?
- Does the player understand why the unscreened shot is saved?
- Is a second CYCLE read as a risky extension rather than a free score action?
- Does the looming Flare penalty create a genuine "change or stay" question?

## Explicit exclusions

No active stick rules, Coach Lab mode, drafting, upgrades, score target,
passive score accumulation, final UI treatment, timing mode, or content
progression belongs to this test.
