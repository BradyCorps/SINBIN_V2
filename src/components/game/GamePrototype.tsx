"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { liveTick, tacticalBeat } from "@/src/game/clocks/policies";
import { playerDefinition } from "@/src/game/content/players";
import {
  createInitialGame,
  periodResult,
  previewShot,
  reduceGame,
} from "@/src/game/core/engine";
import {
  ACTIVE_SLOTS,
  type ActiveSlot,
  type GameAction,
  type GameState,
  type LaneMode,
  type PlayPhase,
  type PlayerId,
} from "@/src/game/core/types";
import { StageScaler } from "./StageScaler";

const PHASE_LABELS: Record<PlayPhase, string> = {
  "loose-puck": "Loose puck",
  controlled: "Controlled",
  "zone-entry": "Zone entry",
  "scoring-setup": "Scoring setup",
  "shot-ready": "Shot ready",
};

const SLOT_LABELS: Record<ActiveSlot, string> = {
  recover: "Recover",
  create: "Create",
  finish: "Finish",
};

function format(value: number): string {
  return Math.round(value).toLocaleString();
}

function EffectLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p className="effect-line">
      <b>{label}</b>
      <span>{children}</span>
    </p>
  );
}

function ActivePlayer({
  state,
  slot,
  selectedIncoming,
  onReplace,
}: {
  state: GameState;
  slot: ActiveSlot;
  selectedIncoming: PlayerId | null;
  onReplace: (slot: ActiveSlot) => void;
}) {
  const id = state.active[slot];
  const definition = playerDefinition(id);
  const runtime = state.players[id];
  const isHolder = state.puck.holderId === id;
  const staminaPercent = (runtime.stamina / definition.maxStamina) * 100;

  return (
    <button
      className={`line-player${isHolder ? " line-player--puck" : ""}${
        runtime.stamina <= 20 ? " line-player--low" : ""
      }`}
      style={{ "--player-accent": definition.accent } as React.CSSProperties}
      onClick={() => onReplace(slot)}
      disabled={!selectedIncoming || state.status !== "playing"}
      aria-label={`${SLOT_LABELS[slot]}: ${definition.name}, ${definition.role}, ${Math.ceil(runtime.stamina)} Stamina${isHolder ? ", has puck" : ""}${selectedIncoming ? `. Replace with ${playerDefinition(selectedIncoming).name}` : ""}`}
    >
      <header>
        <span>{SLOT_LABELS[slot]}</span>
        <b>{definition.role}</b>
        {isHolder && <em>PUCK</em>}
      </header>
      <div className="line-player__identity">
        <i aria-hidden="true">{definition.shortName.at(0)}</i>
        <strong>{definition.shortName}</strong>
        <small>{Math.ceil(runtime.stamina)} STA</small>
      </div>
      <div className="line-player__stamina" aria-hidden="true">
        <b style={{ width: `${staminaPercent}%` }} />
      </div>
      <EffectLine label="ENTER">
        {definition.entryEffect.replaceAll("-", " ")}
      </EffectLine>
      <EffectLine label="EXIT">
        {definition.exitEffect.replaceAll("-", " ")}
      </EffectLine>
      <EffectLine label={definition.stick.name}>
        {definition.stick.effect}
      </EffectLine>
    </button>
  );
}

function BenchPlayer({
  state,
  id,
  selected,
  onSelect,
}: {
  state: GameState;
  id: PlayerId;
  selected: boolean;
  onSelect: () => void;
}) {
  const definition = playerDefinition(id);
  const runtime = state.players[id];
  const locked = runtime.reentryLockMs > 0;
  return (
    <button
      className={`bench-player${selected ? " bench-player--selected" : ""}`}
      style={{ "--player-accent": definition.accent } as React.CSSProperties}
      onClick={onSelect}
      disabled={state.status !== "playing" || locked}
      aria-pressed={selected}
      aria-label={`${definition.name}, ${definition.role}, ${Math.ceil(runtime.stamina)} Stamina${locked ? `, locked for ${Math.ceil(runtime.reentryLockMs / 100) / 10} seconds` : ""}`}
    >
      <i aria-hidden="true">{definition.shortName.at(0)}</i>
      <span>
        <small>{definition.role}</small>
        <strong>{definition.shortName}</strong>
        <b>{Math.ceil(runtime.stamina)} STA</b>
      </span>
      <div>
        <EffectLine label="ENTER">
          {locked
            ? `${(runtime.reentryLockMs / 1_000).toFixed(1)}s re-entry lock`
            : definition.entryEffect.replaceAll("-", " ")}
        </EffectLine>
        <EffectLine label="EXIT">
          {definition.exitEffect.replaceAll("-", " ")}
        </EffectLine>
        <EffectLine label={definition.stick.name}>
          {definition.stick.effect}
        </EffectLine>
      </div>
    </button>
  );
}

export function GamePrototype({
  initialState,
  initialMode = "live",
}: {
  initialState?: GameState;
  initialMode?: LaneMode;
}) {
  const [game, setGame] = useState<GameState>(
    () => initialState ?? createInitialGame(),
  );
  const [mode, setMode] = useState<LaneMode>(initialMode);
  const [selectedBench, setSelectedBench] = useState<PlayerId | null>(null);
  const [livePaused, setLivePaused] = useState(false);

  const dispatch = useCallback((action: GameAction) => {
    setGame((current) => reduceGame(current, action));
  }, []);

  useEffect(() => {
    if (mode !== "live" || livePaused || game.status !== "playing") return;
    const timer = window.setInterval(() => dispatch(liveTick()), 100);
    return () => window.clearInterval(timer);
  }, [dispatch, game.status, livePaused, mode]);

  const shot = useMemo(() => previewShot(game), [game]);
  const latestEvent = game.eventLog.at(-1)?.message ?? "Shift ready.";
  const result = periodResult(game);

  const replace = (slot: ActiveSlot) => {
    if (!selectedBench) return;
    dispatch({ type: "SUBSTITUTE", incomingId: selectedBench, slot });
    setSelectedBench(null);
  };

  const restart = () => {
    dispatch({ type: "RESTART" });
    setSelectedBench(null);
    setLivePaused(false);
  };

  return (
    <main className="prototype-viewport">
      <StageScaler>
        <section className="prototype-stage" aria-label="SINBIN V0.2 prototype">
          <header className="match-header">
            <div className="wordmark">
              <small>V0.2 LIVE SHIFT</small>
              <strong>SINBIN</strong>
              <span>Break the shape. Beat the goalie.</span>
            </div>
            <div className="scoreboard" aria-label="Match score">
              <span>SINBIN</span>
              <strong>
                {game.teamGoals} <i>—</i> {game.opponentGoals}
              </strong>
              <span>OPPONENT</span>
            </div>
            <div className="shift-module">
              <span>SHIFT</span>
              <strong>
                {game.shiftNumber}/{game.maximumShifts}
              </strong>
            </div>
            <div className="mode-toggle" aria-label="Pacing lane">
              {(["live", "tactical"] as const).map((lane) => (
                <button
                  key={lane}
                  className={mode === lane ? "selected" : ""}
                  onClick={() => {
                    setMode(lane);
                    setLivePaused(false);
                  }}
                  aria-pressed={mode === lane}
                >
                  {lane === "live" ? "LIVE" : "COACH LAB"}
                </button>
              ))}
            </div>
          </header>

          <aside className="bench-panel" aria-label="Bench and effects">
            <header>
              <span>BENCH</span>
              <strong>
                {selectedBench ? "CHOOSE A SLOT" : "SELECT INCOMING"}
              </strong>
            </header>
            <div className="bench-list">
              {game.bench.map((id) => (
                <BenchPlayer
                  key={id}
                  state={game}
                  id={id}
                  selected={selectedBench === id}
                  onSelect={() =>
                    setSelectedBench((current) => (current === id ? null : id))
                  }
                />
              ))}
            </div>
          </aside>

          <section className="rink-panel" aria-label="Current hockey play">
            <header className="rink-status">
              <div className="phase-track">
                {(Object.keys(PHASE_LABELS) as PlayPhase[]).map((phase) => (
                  <span
                    key={phase}
                    className={phase === game.puck.phase ? "current" : ""}
                  >
                    {PHASE_LABELS[phase]}
                  </span>
                ))}
              </div>
              <p aria-live="polite">{latestEvent}</p>
            </header>
            <div className="active-line" aria-label="Active line">
              {ACTIVE_SLOTS.map((slot) => (
                <ActivePlayer
                  key={slot}
                  state={game}
                  slot={slot}
                  selectedIncoming={selectedBench}
                  onReplace={replace}
                />
              ))}
            </div>
            <div className="rink-legend">
              <span>PUCK STATE: {PHASE_LABELS[game.puck.phase]}</span>
              <span>
                {game.dangerRemainingMs === null
                  ? "LINE STABLE"
                  : `DANGER: ${(game.dangerRemainingMs / 1_000).toFixed(1)}S`}
              </span>
            </div>
          </section>

          <aside className="chance-panel" aria-label="Shot chance and actions">
            <div className="chance-summary">
              <span>GOAL CHANCE</span>
              <strong>{shot.chancePercent.toFixed(1)}%</strong>
              <small>{shot.formula}</small>
            </div>
            <div className="chance-factors">
              <span>
                UNBANKED MOMENTUM <b>{format(game.momentum)}</b>
              </span>
              <span>
                GOALIE COMPOSURE <b>−{format(game.goalieComposure)}</b>
              </span>
              {shot.factors.map((factor) => (
                <small key={factor}>{factor}</small>
              ))}
            </div>
            <div className="pressure-module">
              <span>OPPONENT PRESSURE</span>
              <strong>{format(game.pressure)} / 100</strong>
              <i aria-hidden="true">
                <b style={{ width: `${game.pressure}%` }} />
              </i>
            </div>
            <button
              className="shoot-button"
              onClick={() => {
                setSelectedBench(null);
                dispatch({ type: "SHOOT" });
              }}
              disabled={game.status !== "playing"}
            >
              <span>SHOOT</span>
              <strong>{shot.chancePercent.toFixed(1)}% TO SCORE</strong>
            </button>
            {mode === "tactical" ? (
              <button
                className="clock-button"
                onClick={() => dispatch(tacticalBeat())}
                disabled={game.status !== "playing"}
              >
                ADVANCE LAB BEAT
              </button>
            ) : (
              <button
                className="clock-button"
                onClick={() => setLivePaused((paused) => !paused)}
                disabled={game.status !== "playing"}
              >
                {livePaused ? "RESUME LIVE CLOCK" : "PAUSE LIVE CLOCK"}
              </button>
            )}
          </aside>

          {game.status !== "playing" && (
            <div className="shift-overlay" role="dialog" aria-modal="true">
              <small>
                {game.status === "period-complete"
                  ? "PERIOD COMPLETE"
                  : `SHIFT ${game.shiftNumber} COMPLETE`}
              </small>
              <strong>
                {game.lastShiftOutcome === "goal"
                  ? "GOAL"
                  : game.lastShiftOutcome === "save"
                    ? "SAVE"
                    : "GOAL AGAINST"}
              </strong>
              <span>
                {game.status === "period-complete"
                  ? `${result.toUpperCase()} · SINBIN ${game.teamGoals} — ${game.opponentGoals} OPPONENT`
                  : latestEvent}
              </span>
              {game.lastShot && (
                <em>
                  {game.lastShot.chancePercent.toFixed(1)}% chance · roll{" "}
                  {game.lastShot.rollPercent.toFixed(1)}
                </em>
              )}
              {game.status === "period-complete" ? (
                <button onClick={restart}>RESTART PERIOD</button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedBench(null);
                    dispatch({ type: "NEXT_SHIFT" });
                  }}
                >
                  START SHIFT {game.shiftNumber + 1}
                </button>
              )}
            </div>
          )}
        </section>
      </StageScaler>
    </main>
  );
}
