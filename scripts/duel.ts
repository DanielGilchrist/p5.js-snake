/*
  used to benchmark changes to CPU
*/

import * as Assert from "../src/core/assert";
import * as Autopilot from "../src/core/autopilot";
import * as Board from "../src/core/board";
import * as Game from "../src/core/game";
import * as Geometry from "../src/core/geometry";
import * as Option from "../src/core/option";
import * as Player from "../src/core/player";
import * as Players from "../src/core/players";
import * as Rng from "../src/core/rng";
import * as Snake from "../src/core/snake";
import * as Turns from "../src/core/turns";
import * as World from "../src/core/world";

const ROOM: Board.GridSize = { cols: 22, rows: 14 };
const ROUNDS = 200;
const LIMIT = 4000;

const WALL = "wall";
const OWN_TAIL = "own tail";
const RIVAL_BODY = "rival body";
const CORPSE = "corpse";
const HEAD_ON = "head on";
const UNKNOWN = "unknown";

type Cause =
  | typeof WALL
  | typeof OWN_TAIL
  | typeof RIVAL_BODY
  | typeof CORPSE
  | typeof HEAD_ON
  | typeof UNKNOWN;

type Tally = {
  rounds: number;
  ticks: number;
  scored: number;
  draws: number;
  won: number;
  trades: number;
  avoidable: number;
  deaths: Map<Cause, number>;
};

const blank = (): Tally => ({
  rounds: 0,
  ticks: 0,
  scored: 0,
  draws: 0,
  won: 0,
  trades: 0,
  avoidable: 0,
  deaths: new Map(),
});

const note = (tally: Tally, cause: Cause): void => {
  tally.deaths.set(cause, (tally.deaths.get(cause) ?? 0) + 1);
};

const stepped = <B>(api: Board.Api<B>, player: Player.Type<B>): Option.Type<Snake.State<B>> => {
  const taken = Turns.next(player.turns);
  const facing = taken.some ? Snake.turnTo(player.snake, taken.value) : player.snake;
  const moved = Snake.tryMove(api, facing);

  return moved.kind === Snake.HIT_WALL
    ? Option.none
    : Option.some(Snake.moveTo(facing, moved.to, moved.dropped));
};

const blamed = <B>(
  api: Board.Api<B>,
  before: World.Type<B>,
  who: Players.Id,
  at: Board.Cell<B>,
): Cause => {
  const mine = Players.at(before.players, who);

  if (!mine.some) return UNKNOWN;

  const after = stepped(api, mine.value);

  if (!after.some) return WALL;

  for (const [other, player] of Players.everyone(before.players)) {
    if (other === who) continue;

    if (!player.alive) {
      if (Snake.occupies(player.snake, at)) return CORPSE;

      continue;
    }

    const theirs = stepped(api, player);

    if (!theirs.some) continue;
    if (Board.equals(theirs.value.head, at)) return HEAD_ON;
    if (Snake.occupies(theirs.value, at)) return RIVAL_BODY;
  }

  return Snake.hitsItself(after.value) ? OWN_TAIL : UNKNOWN;
};

const greedily = <B>(
  api: Board.Api<B>,
  world: World.Type<B>,
  who: Players.Id,
): Option.Type<Geometry.Direction> => {
  const sitting = Players.at(world.players, who);

  if (!sitting.some || !sitting.value.alive) return Option.none;

  const { snake, turns } = sitting.value;
  const clear = (cell: Board.Cell<B>): boolean =>
    !world.players.some((player) => player.alive && Snake.occupies(player.snake, cell));

  let picked: Option.Type<Geometry.Direction> = Option.none;
  let closest = Number.POSITIVE_INFINITY;

  for (const heading of Geometry.DIRECTIONS) {
    if (!Turns.accept(turns, snake.facing, heading).some) continue;

    const step = api.move(snake.head, heading);

    if (step.kind === Snake.HIT_WALL || !clear(step.cell)) continue;

    const reach = gap(step.cell, world.food);

    if (reach < closest) {
      closest = reach;
      picked = Option.some(heading);
    }
  }

  return picked;
};

const gap = <B>(a: Board.Cell<B>, b: Board.Cell<B>): number =>
  Math.abs(a.col - b.col) + Math.abs(a.row - b.row);

const steer = <B>(
  api: Board.Api<B>,
  state: Game.State<B>,
  who: Players.Id,
  thinking: (
    api: Board.Api<B>,
    world: World.Type<B>,
    who: Players.Id,
  ) => Option.Type<Geometry.Direction>,
): Game.State<B> => {
  const picked = thinking(api, state.world, who);

  return picked.some ? Game.step(api, state, Game.turn(who, picked.value)).state : state;
};

const round = <B>(
  api: Board.Api<B>,
  board: Board.Grid<B>,
  seed: number,
  players: number,
  tally: Tally,
  sparring = false,
): void => {
  let state = Game.start(board, Rng.fromSeed(seed), Game.forPlayers(players));
  let ticks = 0;

  while (state.kind === Game.PLAYING && ticks < LIMIT) {
    for (const [who] of Players.everyone(state.world.players)) {
      state = steer(
        api,
        state,
        who,
        sparring && who !== Players.FIRST ? greedily : Autopilot.choose,
      );
    }

    const before = state.world;
    const ticked = Game.step(api, state, Game.tick);

    state = ticked.state;
    ticks += 1;

    for (const event of ticked.events) {
      if (event.kind !== Game.DIED) continue;

      const cause = blamed(api, before, event.player, event.at);

      note(tally, cause);

      if (cause === HEAD_ON && event.player === Players.FIRST) {
        const seen = Autopilot.looksFor(api, before, Players.FIRST);

        tally.trades += 1;
        if (seen.some((look) => !look.contested)) tally.avoidable += 1;
      }
    }
  }

  tally.rounds += 1;
  tally.ticks += ticks;
  tally.scored += Players.scored(state.world.players);

  if (state.kind === Game.OVER && state.outcome.ending === World.TRADED) tally.draws += 1;

  const mine = Players.at(state.world.players, Players.FIRST);
  const others = Players.everyone(state.world.players).filter(([who]) => who !== Players.FIRST);

  if (mine.some && mine.value.alive && others.every(([, player]) => !player.alive)) {
    tally.won += 1;
  }
};

const shown = (name: string, tally: Tally, sparring: boolean): void => {
  const deaths = [...tally.deaths.entries()]
    .toSorted((one, other) => other[1] - one[1])
    .map(([cause, count]) => `${cause} ${count}`)
    .join(", ");

  console.log(
    `${name.padEnd(10)} | ticks/round ${(tally.ticks / tally.rounds).toFixed(0).padStart(4)}` +
      ` | fruit/round ${(tally.scored / tally.rounds).toFixed(1).padStart(5)}` +
      ` | draws ${((tally.draws / tally.rounds) * 100).toFixed(0).padStart(3)}%` +
      (sparring ? ` | won ${((tally.won / tally.rounds) * 100).toFixed(0).padStart(3)}%` : "") +
      ` | walked into ${tally.avoidable}/${tally.trades}` +
      ` | ${deaths}`,
  );
};

const run = (name: string, players: number, sparring: boolean): void => {
  const tally = blank();

  const done = Board.parse(ROOM, <B>(board: Board.Grid<B>, api: Board.Api<B>): void => {
    for (let seed = 1; seed <= ROUNDS; seed++) round(api, board, seed, players, tally, sparring);
  });

  if (!done.ok) Assert.unreachable("the bench board must parse");

  shown(name, tally, sparring);
};

console.log(`${ROUNDS} rounds each, ${ROOM.cols}x${ROOM.rows}\n`);

for (const players of [2, 4, 8]) run(`${players} players`, players, false);

console.log("");

for (const players of [2, 4]) run(`vs greedy ${players}`, players, true);
