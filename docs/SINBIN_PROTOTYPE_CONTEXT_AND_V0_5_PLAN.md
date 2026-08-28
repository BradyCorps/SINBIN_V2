# SINBIN Prototype Context and V0.5 Plan

## Purpose of this document

This is the working handoff for reviewing and continuing the SINBIN rectangle
prototype. It records the design decisions that have already been made, the
specific questions each version is meant to answer, and the narrowly scoped
next build.

The governing rule is simple:

> If the game is not compelling with rectangles, deterministic states, and no
> progression, presentation will not fix it.

Do not add art, meta progression, collectability, equipment, or production UI
to compensate for an unproven decision loop.

## Product proposition

SINBIN is a hockey game where **line changes are the primary combo input**.

The player is not merely keeping meters alive. They read the puck, defensive
shape, and current line; substitute players while the play is live; route the
puck into an exposed lane; choose when to shoot; and live with the defensive
consequences if the play breaks down.

The intended full shift rhythm is:

```text
Read opponent shape
→ construct an attacking route
→ shoot, protect, or extend
→ turnover if the play breaks
→ defend the AI counterattack with the line left on the ice
→ recover possession or concede
```

## Current repository and review chain

Repository: `BradyCorps/SINBIN_V2`

| Version   | Review branch / PR                             | What it introduced                                                             |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Bootstrap | `feature/repository-bootstrap` / PR #1         | Clean Next.js/TypeScript/Storybook and deterministic-engine foundation         |
| V0.2      | `feature/v0.2-live-coach-foundation` / PR #2   | Earlier desktop prototype; useful as a rejected focus reference                |
| V0.3      | `feature/v0.3-defensive-structure-lab` / PR #3 | Visible opponent coverage, puck routing, goalie state, deterministic shot read |
| V0.4      | `feature/v0.4-counterattack-lab` / PR #4       | Playable turnover and defensive counterattack                                  |

The V0.3 and V0.4 branches are intentionally stacked. Do not retarget them to
`main` independently unless their parent work has been merged first.

## What V0.3 established

V0.3 converted the prototype from a passive stamina/score loop into an explicit
hockey route.

### The current attacking route

```text
Jet replaces Rook
→ Jet carries into the offensive zone and pulls the left defender
→ Lane cycles cross-ice; goalie moves and right defender is pulled
→ Ridge replaces Jet; defender is pinned and goalie is screened
→ Flare shoots through an exposed lane
```

The rink, not card paragraphs, explains the result:

- left / slot / right lane coverage is visible;
- defenders are Covered, Pulled, Pinned, or Open;
- the goalie is Set, Moving, or Screened;
- the puck visibly occupies a lane;
- the five-factor shot read is deterministic.

### V0.3 limitation

It still had a largely solved route. Extending was a visible failure condition,
but failure did not produce more hockey. V0.4 addresses that limitation.

## What V0.4 established

V0.4 makes an overextended chance a turnover instead of an immediate restart.
The player must then defend the line they chose to leave on the ice.

### Current counterattack route

```text
Overextend a scoring chance
→ opponent gets a left-lane carry
→ cross-ice pass to the right lane
→ net-front / slot chance
→ defensive stop or goal against
```

### Current defensive answers

| Player / action     | Current purpose                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Hatch, Disruptor    | Immediate puck pressure and takeaway                                                                      |
| Ridge, Grinder      | Immediate puck pressure; later crease clear                                                               |
| Rook, Retriever     | Clears a live net-front chance; restores controlled neutral possession when active                        |
| Any non-Sniper line | Can close the next passing lane to intercept it                                                           |
| Jet, Carrier        | Present, but has no distinctive defensive solution yet                                                    |
| Lane, Playmaker     | Present, but has no distinctive defensive solution yet                                                    |
| Flare, Sniper       | Strong offensive finisher; cannot solve immediate puck pressure and is deliberately a defensive liability |

### V0.4 limitation

The counterattack path and defensive answer are still mostly deterministic and
known. It proves that punishment can become playable hockey, not that the game
yet supports roster depth or repeat play.

## What has and has not been proven

### Implemented and independently checked

- Deterministic shift engine, role definitions, re-entry locks, and scenario
  tests.
- V0.3 attacking route and V0.4 counterattack route.
- Desktop rectangle UI that exposes puck lane, opponent state, active line,
  bench, role details, causal log, shot read, and defensive response.
- Current V0.4 CI: typecheck, formatting, lint, unit tests, Playwright browser
  tests, production build, and Storybook build pass.

### Still unproven

- Whether players find the complete attack-to-defence loop intrinsically
  addictive over repeated shifts.
- Whether more than one line construction creates a genuinely different rhythm.
- Whether there are multiple good decisions in each opponent structure.
- Whether the Flare/Sniper liability is felt as interesting risk rather than a
  mandatory substitution.
- Any economy, progression, equipment, drafting, balance, mobile UX, art, or
  production-content claim.

## V0.5: Formation Variety Rectangle Lab

### Single question

> Do opponent formations and line construction create multiple valid routes and
> defensive answers, rather than one solved script?

### In scope

Build exactly three visible opponent formations. Each formation must alter both
the offensive route and the counterattack that follows a turnover.

| Formation     | Starting defensive truth                                        | Offensive implication                 | Counterattack implication         |
| ------------- | --------------------------------------------------------------- | ------------------------------------- | --------------------------------- |
| Slot Collapse | Slot protected; wide lanes comparatively available              | Build wide, then pull coverage inward | Wide rush into a net-front feed   |
| Wide Denial   | Wings closed; middle is the available route                     | Carry or playmake through the middle  | Middle carry, then far-post pass  |
| High Press    | Defence is easier to pull but dangerous when possession is lost | Fast route can create an early shot   | Immediate, fast cross-ice counter |

These labels are prototype language. Do not claim they are authentic NHL
systems until the gameplay behaviour is proven and named more precisely.

### Role-response target

Each role needs a visible tactical use across offence and defence. The first
pass should add only the minimum distinct answers below.

| Role      | Offensive contribution                 | Defensive contribution to test                                       |
| --------- | -------------------------------------- | -------------------------------------------------------------------- |
| Retriever | Recover loose puck / secure transition | Intercept loose feed or clear net front                              |
| Carrier   | Advance through the available lane     | Force puck carrier wide; buys one defensive action                   |
| Playmaker | Cross-lane route creation              | Read and intercept one predicted passing lane                        |
| Grinder   | Pin / screen / sustain a route         | Pressure puck and clear crease                                       |
| Disruptor | Break forecheck / disrupt shape        | Immediate strip or break an active pass route                        |
| Sniper    | High-value finish                      | Cannot pressure or close alone; must rely on teammates or be changed |

No role should become a generic `+x%` modifier. Its effect should move the puck,
coverage, goalie, opponent route, or available action on the board.

### Required player-facing decisions

For every formation, a player must be able to make at least two defensible
choices. Examples:

- Shoot through a merely decent opening or cycle to pull the stronger coverage.
- Change Flare out before a likely turnover, or keep Flare for the finish.
- Pressure the puck with Hatch/Ridge, or pre-close the likely pass with a
  different line.
- Accept a reset to neutral or preserve a fragile offensive route.

If one answer dominates every formation, change the formation/role interaction
before adding more content.

## V0.5 implementation order

1. Introduce a data-driven `OpponentFormation` definition: visible starting
   coverage, goalie state, named weak point, and counterattack route.
2. Replace the one hard-coded initial formation with a deterministic formation
   selector for testing and Storybook scenarios.
3. Implement the two additional formations and their counterattack routes.
4. Add the minimal Carrier and Playmaker defensive actions described above.
5. Ensure the board and causal log explain every route change without reading
   source code or dense paragraphs.
6. Add deterministic engine scenarios and browser tests for every formation,
   both defensive recovery and goal-against outcomes.
7. Run focused human playtests before considering sticks, upgrades, or drafting.

## Explicit exclusions for V0.5

- Active stick/equipment gameplay.
- Drafting, upgrades, relic-style modules, chemistry, season progression, or
  economy.
- More than three opponent formations.
- Full AI simulation, random outcomes, hidden rolls, or adaptive difficulty.
- Full SINBIN penalty kill system; current Discipline remains an on-board risk
  signal until the short-handed board state has a clear purpose.
- Final visual design, character art integration, mobile redesign, audio, or
  production onboarding.

## V0.5 pass/fail gate

Advance only if most external testers can:

- describe the opponent's initial weak point before their first action;
- explain why their route worked or why the turnover occurred;
- identify an alternative valid route after a failed attempt;
- name a reason to keep or remove Flare during an unstable play;
- deliberately choose a defensive response rather than simply press the only
  action that works;
- remember a specific attack-to-defence swing after the session.

Pause and simplify if testers say they are servicing labels, cannot see the
opponent's next route, or discover one universal line-change sequence.

## Direction after V0.5

Only after formation and role variety pass the rectangle gate should the project
enter a content-expansion phase. Sticks are the first likely addition because
they can alter an existing route or trade-off. They must be designed as visible
hockey grammar, not a stat layer.
