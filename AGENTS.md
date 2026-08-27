# SINBIN product repository instructions

## Purpose

This is the clean SINBIN product repository. The Workshop remains at
`BradyCorps/Sin-Bin`; experiments are not promoted here by default.

The product thesis is:

> Construct a hockey play by changing players, then shoot before the play collapses.

## Non-negotiable architecture

- One deterministic, framework-agnostic shift engine.
- Tactical and Live are clock policies over the same actions and rules.
- The engine never reads the wall clock or owns browser timers.
- Major Momentum gains come from hockey-play advancement, not passive survival.
- Substitution is the signature verb; SHOOT is the voluntary cash-out.
- Preserve exact event ordering and legible failure reasons.
- Use seeded randomness only when randomness is introduced.

## Repository boundaries

- `main` must remain playable and pass required checks.
- Use short-lived `feature/*`, `fix/*`, and `experiment/*` branches.
- Do not copy Workshop gameplay code wholesale.
- Every migrated item must appear in `docs/migration/MIGRATION_LEDGER.md`.
- Every shipped non-code asset must appear in `docs/ASSET_MANIFEST.md`.
- Assets with unknown rights remain reference-only and outside runtime paths.
- Do not add auth, a database, deployment bindings, monetization, or progression
  until its release gate explicitly requires it.

## Required verification

Run typecheck, lint, unit tests, production build, and Storybook build after
material changes. Add deterministic fixtures for gameplay changes. Never accept
a live-match visual change on build success alone; validate at 667×375,
844×390, and 915×412 when layout geometry changes.
