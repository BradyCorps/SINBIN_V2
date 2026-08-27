# SINBIN

SINBIN is a hockey strategy game about constructing and operating a live scoring
machine. Change players to advance the puck through a readable hockey sequence,
then shoot before Stamina or opponent Pressure collapses the shift.

This repository is the clean product line. Experimental history and rejected
mechanics remain in the [SINBIN Workshop](https://github.com/BradyCorps/Sin-Bin).

## Current milestone

`v0.0.1` — Draft rectangle prototype

- Three active players and three bench players
- Visible puck and play state
- Role-driven Entry and Exit effects
- Stamina and opponent Pressure
- Deterministic SHOOT cash-out
- Tactical and Live clock policies over one engine
- Five-shift period target

## Commands

```bash
npm ci
npm run dev
npm test
npm run check
npm run storybook
```

## Product pipeline

Draft → `v0.1.0-prototype` → `v0.5.0-alpha` → `v0.8.0-beta` → `v1.0.0`

See `docs/RELEASE_GATES.md` for the evidence required at each stage.
