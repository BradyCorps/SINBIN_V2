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

## 2026-08-27 — V0.2 is desktop-first and goal-facing

V0.2 prioritizes a 16:9 desktop presentation suitable for a PC-first Steam
vertical slice. This is a presentation priority, not a second game: a future
mobile interface will consume the same deterministic engine.

The visible 10,000 Momentum target is removed. Momentum remains the temporary
measure of offensive force, but SHOOT now resolves a transparent, seeded chance
to score. Goals are the match score. Goalie composure and later defensive
structure explain why a chance succeeds or fails.

## 2026-08-27 — Coach Mode, sticks, and discipline are V0.2 foundations

Coach Mode will not be a manually advanced version of Live. It will use finite
opponent decision points over the shared engine. Sticks are the first intended
equipment slot and must modify hockey grammar before they add generic numbers.
Discipline will create visible, player-caused SINBIN risk; it is documented now
and intentionally held from the first goal-model implementation until its
short-handed state can be made legible.

## 2026-08-27 — V0.3 resets the prototype to defensive structure

V0.2 confirmed that the substitution controls are operable, but did not answer
the rectangle gate. It presented a desktop version of the existing
stamina-and-shoot loop without making the opponent's shape, the causal route,
or the decision to extend intelligible.

V0.3 therefore removes passive Momentum farming, five-shift targets, and the
Coach Lab presentation. It uses a deterministic single-shift formation: visible
lane coverage, visible goalie state, a cross-ice route, and one Flare
discipline/SINBIN liability. This is a mechanics test, not an alpha feature
commitment.

## 2026-08-27 — V0.4 makes a turnover playable

An immediate failed-shift result did not test hockey's possession rhythm. V0.4
therefore turns an overextended attack into one visible AI counterattack:
left-lane carry, cross-ice pass, then net-front chance. A defensive stop returns
the puck to neutral; failure concedes a goal against.

This is a core-loop change, not a V0.31 presentation adjustment. It also gives
Flare a concrete trade-off: a superior finisher cannot solve the immediate
defensive puck-pressure problem.

## 2026-08-28 — V0.5 tests formation and role variety

V0.5 keeps the single deterministic shift and replaces the fixed opponent shape
with exactly three data-defined rectangle formations. Each formation owns its
visible starting coverage, weak point, attack lanes, and ordered counterattack
route. Selection is explicit for repeatable tests and Storybook scenarios.

The V0.3 Jet-to-Ridge shortcut is closed by requiring a developed Chance before
a Grinder can screen. Generic non-Sniper lane closure is replaced by two visible
role responses: Carrier containment buys one defensive action, and Playmaker
lane reading intercepts only the predicted lane. No progression, equipment,
randomness, timing policy, art, or production UI is introduced.
