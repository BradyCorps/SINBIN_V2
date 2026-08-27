# Decision Log

## 2026-08-27 — Fresh product history

The Workshop remains unchanged. SINBIN_V2 starts with fresh history so rejected
experiments, deployment bindings, databases, and unapproved assets do not become
implicit production dependencies.

## 2026-08-27 — One engine, two clock policies

Tactical and Live share state, actions, effects, scoring, and content. Clock
adapters schedule `ADVANCE_CLOCK` events but do not resolve game rules.

## 2026-08-27 — Rebuild the old engine

The Workshop engine passed its own 26-test baseline but resolves a different
cadence-based game. It is retained as evidence and reference, not copied into
the new product.

## 2026-08-27 — Promote only display foundations

The 844×390 `StageScaler` and approved semantic colour values are sufficiently
isolated to promote. Storybook is rebuilt in the new dependency graph. UI skin
assets are deferred rather than copied before the rectangle prototype needs
them.

## 2026-08-27 — Consolidated bootstrap pull request

Because the target repository was empty, PR 0–5 foundations are assembled in
one reviewable bootstrap pull request with separate logical commits where
possible. This avoids merging an unreviewed sequence of dependent empty-repo
pull requests. Later work returns to small focused pull requests.
