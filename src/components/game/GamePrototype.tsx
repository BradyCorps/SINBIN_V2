"use client";

import { useMemo, useState } from "react";
import {
  coverageLabel,
  createInitialGame,
  previewShot,
  reduceGame,
} from "@/src/game/core/engine";
import {
  OPPONENT_FORMATIONS,
  formationDefinition,
} from "@/src/game/content/formations";
import {
  ACTIVE_SLOTS,
  LANES,
  type ActiveSlot,
  type GameAction,
  type GameState,
  type Lane,
  type OpponentFormationId,
  type PlayerId,
} from "@/src/game/core/types";
import { playerDefinition } from "@/src/game/content/players";
import { StageScaler } from "./StageScaler";

const SLOT_LABELS: Record<ActiveSlot, string> = {
  recover: "Recover",
  create: "Create",
  finish: "Finish",
};

function puckLabel(state: GameState): string {
  if (state.phase === "defend" && state.counterattack) {
    const step = currentCounterStep(state);
    return `Opponent puck · ${step?.label ?? "counterattack"} · ${state.counterattack.puckLane}`;
  }
  if (state.puck.state === "loose") return "Loose puck";
  return `${state.puck.state === "chance" ? "Chance" : "Controlled puck"} · ${state.puck.zone} ${state.puck.lane}`;
}

function currentCounterStep(state: GameState) {
  if (!state.counterattack) return null;
  return formationDefinition(state.formationId).counterRoute[
    state.counterattack.stepIndex
  ];
}

function nextDecision(state: GameState, selectedBench: PlayerId | null) {
  const formation = formationDefinition(state.formationId);
  if (selectedBench) {
    const player = playerDefinition(selectedBench);
    return {
      title: `Change ${player.shortName} in`,
      detail: `${player.shortName} enters as a ${player.role}. Click an active player to preview the change on the rink.`,
    };
  }
  if (state.phase === "defend" && state.counterattack) {
    const step = currentCounterStep(state);
    return {
      title: step?.label ?? "Counterattack live",
      detail: step?.predictedLane
        ? `Puck in ${state.counterattack.puckLane}. The route points toward ${step.predictedLane}; choose which role response to trust.`
        : `The ${state.counterattack.puckLane}-lane chance is live at your net.`,
    };
  }
  if (state.penalty) {
    return {
      title: "Finish is short-handed",
      detail: `${playerDefinition(state.penalty.playerId).shortName} is in the SINBIN for ${state.penalty.actionsRemaining} action${state.penalty.actionsRemaining === 1 ? "" : "s"}. Reset or protect the play until they return.`,
    };
  }
  if (state.puck.state === "loose") {
    return {
      title: "Recover possession",
      detail:
        "The puck is loose and the opponent shape has reset. A Retriever can secure the transition.",
    };
  }
  if (state.puck.zone === "neutral") {
    return {
      title: formation.label,
      detail: formation.weakPoint,
    };
  }
  if (state.puck.state === "controlled") {
    return {
      title: `Controlled in ${state.puck.lane}`,
      detail: `The goalie is ${state.defence.goalie}; coverage is ${state.defence.coverage[state.puck.lane]} around the puck.`,
    };
  }
  if (state.defence.goalie !== "screened") {
    return {
      title: `Chance in ${state.puck.lane}`,
      detail: `The goalie is ${state.defence.goalie}. Shoot, extend the route, protect it, or change the line.`,
    };
  }
  return {
    title: "Screen established",
    detail: `The ${state.puck.lane} defender is ${state.defence.coverage[state.puck.lane]} and the goalie is screened.`,
  };
}

function PlayerCard({
  id,
  state,
  location,
  selected,
  onClick,
}: {
  id: PlayerId;
  state: GameState;
  location: string;
  selected?: boolean;
  onClick: () => void;
}) {
  const player = playerDefinition(id);
  const runtime = state.players[id];
  const penalized = state.penalty?.playerId === id;
  return (
    <button
      className={`player-card${selected ? " player-card--selected" : ""}${penalized ? " player-card--penalized" : ""}`}
      style={{ "--player-accent": player.accent } as React.CSSProperties}
      onClick={onClick}
      disabled={state.status !== "playing"}
      aria-label={`${player.name}, ${player.role}, ${location}${penalized ? ", in the SINBIN" : ""}`}
    >
      <span className="player-card__role">
        {location} · {player.role}
      </span>
      <div className="player-card__identity">
        <i aria-hidden="true">{player.shortName.at(0)}</i>
        <strong>{player.shortName}</strong>
        {state.puck.holderId === id && <em>PUCK</em>}
      </div>
      <small>
        {penalized
          ? `SINBIN · ${state.penalty?.actionsRemaining} ACTIONS`
          : `${Math.ceil(runtime.stamina)} STA · DISC ${runtime.discipline}`}
      </small>
    </button>
  );
}

function DefenceToken({ lane, state }: { lane: Lane; state: GameState }) {
  const coverage = state.defence.coverage[lane];
  return (
    <div className={`defender-token defender-token--${coverage}`}>
      <span>{lane === "slot" ? "SLOT" : `${lane.toUpperCase()} LANE`}</span>
      <strong>{coverageLabel(coverage)}</strong>
    </div>
  );
}

function CounterattackToken({ lane, state }: { lane: Lane; state: GameState }) {
  const attack = state.counterattack;
  if (!attack) return null;
  const step = currentCounterStep(state);
  const isPuckLane = attack.puckLane === lane;
  const isPredicted = step?.predictedLane === lane;
  const label = isPuckLane ? step?.label : isPredicted ? "predicted" : "route";
  return (
    <div
      className={`counter-token${isPuckLane ? " counter-token--puck" : ""}${isPredicted ? " counter-token--closed" : ""}`}
    >
      <span>{lane === "slot" ? "SLOT" : `${lane.toUpperCase()} LANE`}</span>
      <strong>{label}</strong>
    </div>
  );
}

export function GamePrototype({
  initialState,
  initialFormationId = "slot-collapse",
}: {
  initialState?: GameState;
  initialFormationId?: OpponentFormationId;
}) {
  const [game, setGame] = useState<GameState>(
    () => initialState ?? createInitialGame(initialFormationId),
  );
  const [selectedBench, setSelectedBench] = useState<PlayerId | null>(null);
  const [inspectedId, setInspectedId] = useState<PlayerId>("rook");

  const dispatch = (action: GameAction) => {
    setGame((current) => reduceGame(current, action));
  };
  const shot = useMemo(() => previewShot(game), [game]);
  const guidance = nextDecision(game, selectedBench);
  const detailId = selectedBench ?? inspectedId;
  const detail = playerDefinition(detailId);
  const formation = formationDefinition(game.formationId);
  const counterStep = currentCounterStep(game);
  const latestEvents = game.eventLog.slice(-4).reverse();

  const chooseBench = (id: PlayerId) => {
    setSelectedBench((current) => (current === id ? null : id));
    setInspectedId(id);
  };

  const chooseActive = (slot: ActiveSlot) => {
    const id = game.active[slot];
    if (!selectedBench) {
      setInspectedId(id);
      return;
    }
    dispatch({ type: "SUBSTITUTE", incomingId: selectedBench, slot });
    setSelectedBench(null);
  };

  return (
    <main className="prototype-viewport">
      <StageScaler>
        <section
          className="v03-stage"
          aria-label="SINBIN V0.5 formation variety mechanics lab"
        >
          <header className="v03-header">
            <div>
              <small>V0.5 RECTANGLE TEST</small>
              <strong>SINBIN</strong>
              <span>Read the shape. Build a route. Defend the swing.</span>
            </div>
            <label className="formation-selector">
              <span>OPPONENT FORMATION</span>
              <select
                aria-label="Opponent formation"
                value={game.formationId}
                onChange={(event) => {
                  dispatch({
                    type: "SELECT_FORMATION",
                    formationId: event.target.value as OpponentFormationId,
                  });
                  setSelectedBench(null);
                }}
              >
                {Object.values(OPPONENT_FORMATIONS).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                dispatch({ type: "RESTART" });
                setSelectedBench(null);
              }}
            >
              RESTART TEST
            </button>
          </header>

          <aside className="v03-bench" aria-label="Bench">
            <header>
              <span>BENCH</span>
              <strong>
                {selectedBench ? "CHOOSE WHO LEAVES" : "SELECT A CHANGE"}
              </strong>
            </header>
            <div>
              {game.bench.map((id) => (
                <PlayerCard
                  key={id}
                  id={id}
                  state={game}
                  location="Bench"
                  selected={selectedBench === id}
                  onClick={() => chooseBench(id)}
                />
              ))}
            </div>
          </aside>

          <section
            className="v03-rink"
            aria-label="Rink and defensive structure"
          >
            <header
              className={game.phase === "defend" ? "rink-header--defend" : ""}
            >
              <div>
                <span>
                  {game.phase === "defend" ? "OPPONENT PUCK" : "PUCK"}
                </span>
                <strong>{puckLabel(game)}</strong>
              </div>
              <div>
                <span>
                  {game.phase === "defend" ? "COUNTER ROUTE" : "FORMATION"}
                </span>
                <strong>
                  {game.phase === "defend"
                    ? counterStep?.label
                    : formation.label}
                </strong>
              </div>
              <div>
                <span>{game.phase === "defend" ? "YOUR NET" : "GOALIE"}</span>
                <strong
                  className={`goalie-state goalie-state--${game.phase === "defend" ? "set" : game.defence.goalie}`}
                >
                  {game.phase === "defend" ? "THREATENED" : game.defence.goalie}
                </strong>
              </div>
            </header>
            <div
              className={`defence-board${game.phase === "defend" ? " defence-board--counterattack" : ""}`}
            >
              {LANES.map((lane) => (
                <div key={lane} className={`rink-lane rink-lane--${lane}`}>
                  {game.phase === "defend" ? (
                    <CounterattackToken lane={lane} state={game} />
                  ) : (
                    <DefenceToken lane={lane} state={game} />
                  )}
                  {game.phase === "attack" && game.puck.lane === lane && (
                    <div
                      className={`puck-token puck-token--${game.puck.state}`}
                    >
                      PUCK
                    </div>
                  )}
                </div>
              ))}
              <div
                className={`goalie-token goalie-token--${game.phase === "defend" ? "set" : game.defence.goalie}`}
              >
                <span>GOALIE</span>
                <strong>
                  {game.phase === "defend" ? "YOUR NET" : game.defence.goalie}
                </strong>
              </div>
            </div>
            <div className="active-line" aria-label="Active line">
              {ACTIVE_SLOTS.map((slot) => (
                <PlayerCard
                  key={slot}
                  id={game.active[slot]}
                  state={game}
                  location={SLOT_LABELS[slot]}
                  onClick={() => chooseActive(slot)}
                />
              ))}
            </div>
          </section>

          <aside
            className="v03-decision"
            aria-label="Decision and player detail"
          >
            <section className="next-move">
              <span>YOUR NEXT DECISION</span>
              <strong>{guidance.title}</strong>
              <p>{guidance.detail}</p>
            </section>

            <section className="shot-preview">
              <header>
                <span>
                  {game.phase === "defend" ? "DEFENSIVE READ" : "SHOT READ"}
                </span>
                <strong>
                  {game.phase === "defend"
                    ? `${(game.counterattack?.stepIndex ?? 0) + 1}/${formation.counterRoute.length}`
                    : `${shot.rating}/5`}
                </strong>
              </header>
              {game.phase === "attack"
                ? shot.factors.map((factor) => (
                    <p
                      key={factor.label}
                      className={factor.active ? "active" : "inactive"}
                    >
                      <i>{factor.active ? "✓" : "×"}</i> {factor.label}
                    </p>
                  ))
                : formation.counterRoute.map((step, index) => (
                    <p
                      key={step.id}
                      className={
                        game.counterattack?.stepIndex === index
                          ? "active"
                          : "inactive"
                      }
                    >
                      <i>{index + 1}</i> {step.label} · {step.puckLane}
                    </p>
                  ))}
              <small>
                {game.phase === "attack"
                  ? shot.summary
                  : counterStep?.predictedLane
                    ? `Predicted next lane: ${counterStep.predictedLane}.`
                    : "Terminal chance: clear it or concede."}
              </small>
            </section>

            <section className="player-detail">
              <span>PLAYER DETAIL · {detail.role.toUpperCase()}</span>
              <strong>{detail.name}</strong>
              <p>
                <b>ENTER</b> {detail.entryEffect.replaceAll("-", " ")}
              </p>
              <p>
                <b>EXIT</b> {detail.exitEffect.replaceAll("-", " ")}
              </p>
              <p>
                <b>STICK</b> {detail.stick.name} <em>parked for this test</em>
              </p>
            </section>

            <section className="lab-actions">
              {game.phase === "attack" ? (
                <>
                  <button
                    onClick={() => dispatch({ type: "CYCLE" })}
                    disabled={game.status !== "playing"}
                  >
                    CYCLE / EXTEND
                  </button>
                  <button
                    onClick={() => dispatch({ type: "RESET_PLAY" })}
                    disabled={game.status !== "playing"}
                  >
                    PROTECT / RESET
                  </button>
                  <button
                    className="shoot"
                    onClick={() => dispatch({ type: "SHOOT" })}
                    disabled={game.status !== "playing"}
                  >
                    SHOOT · {shot.result.toUpperCase()}
                  </button>
                </>
              ) : (
                <div className="defence-actions">
                  <button onClick={() => dispatch({ type: "PRESSURE_PUCK" })}>
                    PRESSURE
                  </button>
                  <button onClick={() => dispatch({ type: "FORCE_WIDE" })}>
                    FORCE WIDE
                  </button>
                  {LANES.map((lane) => (
                    <button
                      key={lane}
                      onClick={() => dispatch({ type: "READ_PASS", lane })}
                    >
                      READ {lane === "slot" ? "SLOT" : lane.toUpperCase()}
                    </button>
                  ))}
                  <button
                    className="shoot"
                    onClick={() => dispatch({ type: "CLEAR_NET_FRONT" })}
                  >
                    CLEAR CHANCE
                  </button>
                </div>
              )}
            </section>
          </aside>

          <footer className="v03-log" aria-label="Causal play log">
            <span>PLAY LOG</span>
            {latestEvents.map((event) => (
              <p key={event.id}>{event.message}</p>
            ))}
            <strong>COUNTER THREAT {game.counterThreat}/100</strong>
          </footer>

          {game.status !== "playing" && (
            <div className="v03-result" role="dialog" aria-modal="true">
              <small>SHIFT RESOLVED</small>
              <strong>
                {game.status === "goal"
                  ? "GOAL"
                  : game.status === "goal-against"
                    ? "GOAL AGAINST"
                    : "BREAKDOWN"}
              </strong>
              <p>{game.eventLog.at(-1)?.message}</p>
              <button
                onClick={() => {
                  dispatch({ type: "RESTART" });
                  setSelectedBench(null);
                }}
              >
                RUN THE TEST AGAIN
              </button>
            </div>
          )}
        </section>
      </StageScaler>
    </main>
  );
}
