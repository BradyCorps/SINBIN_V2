# Mechanics Reference

**Status:** Draft tuning values, not final balance.

## Shift shape

- Six players: three active and three on the bench.
- Active slots: Recover, Create, and Finish.
- Five shifts form one period test.
- The opponent target is 10,000 banked Momentum.
- The known goalie defence is 600.

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

## SHOOT

The shot is deterministic and its complete formula is shown to the player.

```text
gross chance = round(unbanked Momentum × play-state quality)
banked result = max(0, gross chance − known goalie defence)
```

| Play state    | Quality |
| ------------- | ------: |
| Loose puck    |    0.20 |
| Controlled    |    0.40 |
| Zone entry    |    0.60 |
| Scoring setup |    0.82 |
| Shot ready    |    1.00 |

Shooting or turning over ends the current shift. Only a successful cash-out adds
to the period total. The next shift begins with the same six-player arrangement
and refreshed prototype Stamina.
