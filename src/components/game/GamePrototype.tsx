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

function Meter({
  label,
  value,
  maximum,
  danger = false,
}: {
  label: string;
  value: number;
  maximum: number;
  danger?: boolean;
}) {
  const width = `${Math.min(100, Math.max(0, (value / maximum) * 100))}%`;
  return (
    <div className={`compact-meter${danger ? " compact-meter--danger" : ""}`}>
      <span>{label}</span>
      <strong>{format(value)}</strong>
      <i aria-hidden="true">
        <b style={{ width }} />
      </i>
    </div>
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
      className={`active-player${isHolder ? " active-player--puck" : ""}${
        runtime.stamina <= 20 ? " active-player--low" : ""
      }`}
      style={{ "--player-accent": definition.accent } as React.CSSProperties}
      onClick={() => onReplace(slot)}
      disabled={!selectedIncoming || state.status !== "playing"}
      aria-label={`${SLOT_LABELS[slot]}: ${definition.name}, ${definition.role}, ${Math.ceil(runtime.stamina)} Stamina${isHolder ? ", has puck" : ""}${selectedIncoming ? `. Replace with ${playerDefinition(selectedIncoming).name}` : ""}`}
    >
      <header>
        <span>{SLOT_LABELS[slot]}</span>
        <b>{definition.role}</b>
      </header>
      <div className="player-body">
        <i aria-hidden="true">{definition.shortName.at(0)}</i>
        {isHolder && <span className="puck-token">PUCK</span>}
        <small>{definition.entryEffect.replaceAll("-", " ")}</small>
      </div>
      <footer>
        <strong>{definition.shortName}</strong>
        <span>{Math.ceil(runtime.stamina)} STA</span>
        <i aria-hidden="true">
          <b style={{ width: `${staminaPercent}%` }} />
        </i>
      </footer>
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
        <em>
          {locked
            ? `${(runtime.reentryLockMs / 1_000).toFixed(1)}s LOCK`
            : definition.entryEffect.replaceAll("-", " ")}
        </em>
      </span>
    </button>
  );
}

export function GamePrototype({
  initialState,
  initialMode = "tactical",
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
        <section
          className="prototype-stage"
          aria-label="SINBIN shift prototype"
        >
          <header className="prototype-rail">
            <div className="wordmark">
              <small>Draft 0.0.1</small>
              <strong>SINBIN</strong>
              <span>Build the play. Take the shot.</span>
            </div>
            <div className="shift-module">
              <span>SHIFT</span>
              <strong>
                {game.shiftNumber}
                <small>/{game.maximumShifts}</small>
              </strong>
            </div>
            <div className="score-module">
              <span>BANKED / TARGET</span>
              <strong>{format(game.bankedMomentum)}</strong>
              <small>/ {format(game.periodTarget)}</small>
            </div>
            <Meter
              label="PRESSURE"
              value={game.pressure}
              maximum={100}
              danger={game.pressure >= 80}
            />
            <div className="mode-toggle" aria-label="Pacing lane">
              {(["tactical", "live"] as const).map((lane) => (
                <button
                  key={lane}
                  className={mode === lane ? "selected" : ""}
                  onClick={() => {
                    setMode(lane);
                    setLivePaused(false);
                  }}
                  aria-pressed={mode === lane}
                >
                  {lane}
                </button>
              ))}
            </div>
          </header>

          <section className="play-ribbon" aria-label="Current hockey play">
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
            <div className="momentum-display">
              <span>UNBANKED</span>
              <strong>{format(game.momentum)}</strong>
            </div>
            <div className="goalie-display">
              <span>KNOWN GOALIE</span>
              <strong>−{format(game.goalieDefence)}</strong>
            </div>
          </section>

          <section className="active-line" aria-label="Active line">
            {ACTIVE_SLOTS.map((slot) => (
              <ActivePlayer
                key={slot}
                state={game}
                slot={slot}
                selectedIncoming={selectedBench}
                onReplace={replace}
              />
            ))}
            <div className="causal-call" aria-live="polite">
              {latestEvent}
            </div>
          </section>

          <section className="prototype-lower">
            <div className="bench-module">
              <header>
                <span>BENCH — SELECT INCOMING</span>
                {game.dangerRemainingMs !== null && (
                  <strong>
                    DANGER {(game.dangerRemainingMs / 1_000).toFixed(1)}s
                  </strong>
                )}
              </header>
              <div>
                {game.bench.map((id) => (
                  <BenchPlayer
                    key={id}
                    state={game}
                    id={id}
                    selected={selectedBench === id}
                    onSelect={() =>
                      setSelectedBench((current) =>
                        current === id ? null : id,
                      )
                    }
                  />
                ))}
              </div>
            </div>

            <div className="action-module">
              <button
                className="shoot-button"
                onClick={() => {
                  setSelectedBench(null);
                  dispatch({ type: "SHOOT" });
                }}
                disabled={game.status !== "playing"}
              >
                <span>SHOOT</span>
                <strong>Bank {format(shot.banked)}</strong>
                <small>{shot.formula}</small>
              </button>
              {mode === "tactical" ? (
                <button
                  className="clock-button"
                  onClick={() => dispatch(tacticalBeat())}
                  disabled={game.status !== "playing"}
                >
                  ADVANCE ONE PLAY BEAT
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
            </div>
          </section>

          {game.status !== "playing" && (
            <div className="shift-overlay" role="dialog" aria-modal="true">
              <small>
                {game.status === "period-complete"
                  ? "PERIOD COMPLETE"
                  : `SHIFT ${game.shiftNumber} COMPLETE`}
              </small>
              <strong>
                {game.lastShiftOutcome === "turnover"
                  ? "TURNOVER — UNBANKED LOST"
                  : `SHOT BANKED ${format(game.lastBankedAmount)}`}
              </strong>
              <span>
                {game.status === "period-complete"
                  ? `${result.toUpperCase()} · ${format(game.bankedMomentum)} / ${format(game.periodTarget)}`
                  : latestEvent}
              </span>
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

          <div className="portrait-gate">ROTATE DEVICE TO PLAY</div>
        </section>
      </StageScaler>
    </main>
  );
}
