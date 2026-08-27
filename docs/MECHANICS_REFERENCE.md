# Mechanics Reference

**Status:** V0.2 foundation. Tuning values are intentionally provisional.

## Shift shape

- Six players: three active and three on the bench.
- Active slots: Recover, Create, and Finish.
- Five shifts form one period test.
- The player and opponent each have a visible goal total. There is no arbitrary
  Momentum target.
- The opponent owns visible goalie composure and defensive structure. The first
  V0.2 rectangle slice exposes goalie composure; opponent archetypes follow.

## Play progression

```text
LOOSE PUCK → CONTROLLED → ZONE ENTRY → SCORING SETUP → SHOT READY
```

Major Momentum is awarded when a role advances this state. A compatible player
already on the ice may complete the next link automatically; for example, a
Playmaker can convert a zone entry into a setup and a Sniper in Finish can make
that setup shot-ready.

## Resolution order for substitution

1. Validate the incoming bench player and re-entry lock.
2. Resolve the outgoing player's Exit effect.
3. Move the outgoing player to the bench and the incoming player to the slot.
4. Transfer or loosen the puck according to the Exit result.
5. Resolve the incoming player's Entry effect.
6. Resolve on-ice role synergies in order.
7. Apply substitution Pressure and validate game invariants.

## Continuous constraints

- Active players lose 4 Stamina per second.
- Opponent Pressure gains 3 per second.
- Substitution adds 4 Pressure before role effects.
- A player reaching zero Stamina opens a 600 ms danger window.
- Substituting that player or shooting during the window is legal.
- Expiring the danger window causes a turnover.
- Pressure reaching 100 causes an immediate turnover.
- A removed player has a 2,000 ms re-entry lock.

## SHOOT and goals

Momentum never becomes the score directly. It produces a transparent chance to
score a goal. The shot result uses seeded randomness: repeating the same actions
from the same initial state produces the same result.

```text
shot quality = round(unbanked Momentum × play-state quality)
goal chance = clamp((shot quality − goalie composure) / chance scale, 5%, 95%)
goal if seeded shot roll < goal chance
```

| Play state    | Quality |
| ------------- | ------: |
| Loose puck    |    0.20 |
| Controlled    |    0.40 |
| Zone entry    |    0.60 |
| Scoring setup |    0.82 |
| Shot ready    |    1.00 |

The UI shows the chance, the factors that created it, and the result explanation.
A save is an understandable hockey result, not a hidden score penalty.

Shooting ends the current shift. A pressure collapse concedes a goal against and
ends the current shift. The next shift begins with the same six-player
arrangement and refreshed prototype Stamina.

## Coach Mode

Coach Mode will use a finite decision economy rather than a manual clock. Each
decision point presents a hockey situation—loose puck, forecheck, controlled
entry, scoring setup, or threatened player—and the opponent answers meaningful
actions. It shares puck state, roles, substitutions, sticks, shot calculation,
and discipline rules with Live.

## Sticks and discipline

Each player will have one Stick slot. A Stick is primarily a route modifier: it
may preserve a handoff, sustain a screen, alter a pass route, or trade safety for
upside. Generic percentage bonuses are secondary tuning only.

Some players will accumulate visible Discipline risk while they remain in a
dangerous or high-impact state. Crossing an explicit threshold sends that player
to the SINBIN for a defined duration and creates a short-handed problem. This is
a planned V0.2 system, not yet enabled in the initial goal-model slice.
