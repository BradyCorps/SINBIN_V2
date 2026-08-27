"use client";

import { useMemo, useState } from "react";
import {
  coverageLabel,
  createInitialGame,
  previewShot,
  reduceGame,
} from "@/src/game/core/engine";
import {
  ACTIVE_SLOTS,
  LANES,
  type ActiveSlot,
  type GameAction,
  type GameState,
  type Lane,
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
    return `Opponent puck · ${state.counterattack.route.replaceAll("-", " ")} · ${state.counterattack.puckLane}`;
  }
  if (state.puck.state === "loose") return "Loose puck";
  return `${state.puck.state === "chance" ? "Chance" : "Controlled puck"} · ${state.puck.zone} ${state.puck.lane}`;
}

function nextDecision(state: GameState, selectedBench: PlayerId | null) {
  if (selectedBench) {
    const player = playerDefinition(selectedBench);
    return {
      title: `Change ${player.shortName} in`,
      detail: `${player.shortName} enters as a ${player.role}. Click an active player to preview the change on the rink.`,
    };
  }
  if (state.phase === "defend" && state.counterattack) {
    if (state.counterattack.route === "carry") {
      return {
        title: "Stop the left-lane carry",
        detail:
          "Hatch or Ridge can pressure the puck for an immediate takeaway. Or close RIGHT to intercept the cross-ice pass.",
      };
    }
    if (state.counterattack.route === "cross-ice") {
      return {
        title: "Seal the slot",
        detail:
          "The puck is right side. Close SLOT before the net-front feed arrives, or the opponent creates a crease chance.",
      };
    }
    return {
      title: "Clear the net front",
      detail:
        "The opponent has reached the slot. Ridge or Rook can clear the crease; otherwise this becomes a goal against.",
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
        "Get a Retriever on the ice. A bad change leaves the puck loose and allows the defence to reset.",
    };
  }
  if (state.puck.zone === "neutral") {
    return {
      title: "Get Jet on the ice",
      detail:
        "Jet is the Carrier. Replacing Rook with a protected handoff moves the puck into the offensive zone and pulls a defender wide.",
    };
  }
  if (state.puck.state === "controlled") {
    return {
      title: "Cycle the puck cross-ice",
      detail:
        "Lane is on the ice. CYCLE moves the puck to the far lane, pulls coverage, and forces the goalie to move.",
    };
  }
  if (state.defence.goalie !== "screened") {
    return {
      title: "Create a screen",
      detail:
        "The goalie is moving, but still sees the puck. Change Ridge in to pin the defender and screen the net.",
    };
  }
  return {
    title: "The net is exposed",
    detail:
      "The shooting lane is open, the goalie is screened, and Flare is available. SHOOT is a deterministic goal.",
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
  const isPuckLane = attack.puckLane === lane;
  const isBlocked = attack.blockedLane === lane;
  const label = isPuckLane
    ? attack.route.replaceAll("-", " ")
    : isBlocked
      ? "closed"
      : "route";
  return (
    <div
      className={`counter-token${isPuckLane ? " counter-token--puck" : ""}${isBlocked ? " counter-token--closed" : ""}`}
    >
      <span>{lane === "slot" ? "SLOT" : `${lane.toUpperCase()} LANE`}</span>
      <strong>{label}</strong>
    </div>
  );
}

export function GamePrototype({ initialState }: { initialState?: GameState }) {
  const [game, setGame] = useState<GameState>(
    () => initialState ?? createInitialGame(),
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
          aria-label="SINBIN V0.4 counterattack mechanics lab"
        >
          <header className="v03-header">
            <div>
              <small>V0.4 RECTANGLE TEST</small>
              <strong>SINBIN</strong>
              <span>Break the shape. Defend the turnover.</span>
            </div>
            <p>ONE SHIFT · ATTACK → TURNOVER → DEFEND</p>
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
                  {game.phase === "defend" ? "COUNTER ROUTE" : "FORECHECK"}
                </span>
                <strong>
                  {game.phase === "defend"
                    ? game.counterattack?.route.replaceAll("-", " ")
                    : game.defence.forecheck}
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
                    ? `${game.counterattack?.route ?? ""}`
                    : `${shot.rating}/5`}
                </strong>
              </header>
              {game.phase === "attack" ? (
                shot.factors.map((factor) => (
                  <p
                    key={factor.label}
                    className={factor.active ? "active" : "inactive"}
                  >
                    <i>{factor.active ? "✓" : "×"}</i> {factor.label}
                  </p>
                ))
              ) : (
                <>
                  <p
                    className={
                      game.counterattack?.route === "carry"
                        ? "active"
                        : "inactive"
                    }
                  >
                    <i>1</i> Left-lane carry
                  </p>
                  <p
                    className={
                      game.counterattack?.route === "cross-ice"
                        ? "active"
                        : "inactive"
                    }
                  >
                    <i>2</i> Cross-ice pass
                  </p>
                  <p
                    className={
                      game.counterattack?.route === "net-front"
                        ? "active"
                        : "inactive"
                    }
                  >
                    <i>3</i> Net-front chance
                  </p>
                </>
              )}
              <small>
                {game.phase === "attack"
                  ? shot.summary
                  : "Pressure needs Hatch or Ridge. Close the route before it reaches your net."}
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
                <>
                  <button onClick={() => dispatch({ type: "PRESSURE_PUCK" })}>
                    PRESSURE PUCK
                  </button>
                  <button
                    onClick={() =>
                      dispatch({
                        type: "CLOSE_LANE",
                        lane:
                          game.counterattack?.route === "cross-ice"
                            ? "slot"
                            : "right",
                      })
                    }
                  >
                    CLOSE{" "}
                    {game.counterattack?.route === "cross-ice"
                      ? "SLOT"
                      : "RIGHT"}
                  </button>
                  <button
                    className="shoot"
                    onClick={() => dispatch({ type: "CLEAR_NET_FRONT" })}
                  >
                    CLEAR NET FRONT
                  </button>
                </>
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
