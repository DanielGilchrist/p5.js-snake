import { equals, type Board, type BoardApi, type Cell } from "./board";
import type { Brand } from "./brand";
import type { Direction } from "./geometry";
import { fromArray } from "./non-empty";
import { assertNever, getOrElse, none, some, type Option } from "./result";
import { choose, nextInt, type Rng } from "./rng";
import { advance, biteSelf, grow, occupies, spawn, turn, type Snake } from "./snake";

export type Variant = Brand<number, "Variant">;

const variant = (n: number): Variant => n as Variant;

export type World<B> = {
  readonly board: Board<B>;
  readonly snake: Snake<B>;
  readonly food: Cell<B>;
  readonly score: number;
  readonly rng: Rng;
  readonly variant: Variant;
  readonly buffered: readonly Direction[];
};

export type Ending = "collision" | "filled";

export type GameState<B> =
  | { readonly kind: "playing"; readonly world: World<B> }
  | { readonly kind: "paused"; readonly world: World<B> }
  | { readonly kind: "over"; readonly world: World<B>; readonly ending: Ending };

export type Command =
  | { readonly kind: "tick" }
  | { readonly kind: "turn"; readonly direction: Direction }
  | { readonly kind: "togglePause" }
  | { readonly kind: "restart" };

export type GameEvent<B> =
  | { readonly kind: "ate"; readonly at: Cell<B> }
  | { readonly kind: "died"; readonly at: Cell<B> };

export type Step<B> = {
  readonly state: GameState<B>;
  readonly events: readonly GameEvent<B>[];
};

type StateKind = GameState<never>["kind"];
type StateFields<B, K extends StateKind> = Omit<Extract<GameState<B>, { kind: K }>, "kind">;

const State = {
  playing: <B>(fields: StateFields<B, "playing">): GameState<B> => ({ kind: "playing", ...fields }),
  paused: <B>(fields: StateFields<B, "paused">): GameState<B> => ({ kind: "paused", ...fields }),
  over: <B>(fields: StateFields<B, "over">): GameState<B> => ({ kind: "over", ...fields }),
} satisfies Record<StateKind, unknown>;

type EventKind = GameEvent<never>["kind"];
type EventFields<B, K extends EventKind> = Omit<Extract<GameEvent<B>, { kind: K }>, "kind">;

const Event = {
  ate: <B>(fields: EventFields<B, "ate">): GameEvent<B> => ({ kind: "ate", ...fields }),
  died: <B>(fields: EventFields<B, "died">): GameEvent<B> => ({ kind: "died", ...fields }),
} satisfies Record<EventKind, unknown>;

const unchanged = <B>(state: GameState<B>): Step<B> => ({ state, events: [] });

const playOn = <B>(world: World<B>): Step<B> => ({
  state: State.playing({ world }),
  events: [],
});

const dieAt = <B>(world: World<B>, at: Cell<B>): Step<B> => ({
  state: State.over({ world, ending: "collision" }),
  events: [Event.died({ at })],
});

const eatAt = <B>(world: World<B>, at: Cell<B>): Step<B> => ({
  state: State.playing({ world }),
  events: [Event.ate({ at })],
});

const winAt = <B>(world: World<B>, at: Cell<B>): Step<B> => ({
  state: State.over({ world, ending: "filled" }),
  events: [Event.ate({ at })],
});

const withSnake = <B>(world: World<B>, snake: Snake<B>): World<B> => ({ ...world, snake });

const withFood = <B>(world: World<B>, food: Cell<B>, rng: Rng): World<B> => ({
  ...world,
  food,
  rng,
});

const scored = <B>(world: World<B>): World<B> => ({ ...world, score: world.score + 1 });

const withRng = <B>(world: World<B>, rng: Rng): World<B> => ({ ...world, rng });

const MAX_BUFFERED = 2;
const VARIANTS = 20;

const freeCell = <B>(
  board: Board<B>,
  snake: Snake<B>,
  state: Rng,
): readonly [Option<Cell<B>>, Rng] => {
  const candidates = fromArray(board.playable.filter((cell) => !occupies(snake, cell)));

  if (candidates === undefined) return [none, state];

  const [cell, next] = choose(state, candidates);

  return [some(cell), next];
};

export const newGame = <B>(board: Board<B>, state: Rng): GameState<B> => {
  const snake = spawn(board.start, "right");
  const [drawn, seeded] = nextInt(state, VARIANTS);
  const [food, next] = freeCell(board, snake, seeded);

  return State.playing({
    world: {
      board,
      snake,
      food: getOrElse(food, board.start),
      score: 0,
      rng: next,
      variant: variant(drawn),
      buffered: [],
    },
  });
};

const bufferTurn = <B>(world: World<B>, direction: Direction): World<B> =>
  world.buffered.length >= MAX_BUFFERED
    ? world
    : { ...world, buffered: [...world.buffered, direction] };

const applyBufferedTurn = <B>(world: World<B>): World<B> => {
  const [next, ...rest] = world.buffered;

  return next === undefined ? world : { ...world, snake: turn(world.snake, next), buffered: rest };
};

const eat = <B>(world: World<B>, snake: Snake<B>): Step<B> => {
  const fed = grow(snake);
  const [next, rng] = freeCell(world.board, fed, world.rng);
  const grown = scored(withSnake(world, fed));

  return next.some
    ? eatAt(withFood(grown, next.value, rng), snake.head)
    : winAt(withRng(grown, rng), snake.head);
};

const tick = <B>(api: BoardApi<B>, world: World<B>): Step<B> => {
  const steered = applyBufferedTurn(world);
  const moved = advance(api, steered.snake);

  if (moved.kind === "hitWall") return dieAt(steered, steered.snake.head);

  const { snake } = moved;

  if (biteSelf(snake)) return dieAt(withSnake(steered, snake), snake.head);

  return equals(snake.head, steered.food) ? eat(steered, snake) : playOn(withSnake(steered, snake));
};

export const step = <B>(api: BoardApi<B>, state: GameState<B>, command: Command): Step<B> => {
  switch (command.kind) {
    case "tick":
      return state.kind === "playing" ? tick(api, state.world) : unchanged(state);

    case "turn":
      return state.kind === "playing"
        ? playOn(bufferTurn(state.world, command.direction))
        : unchanged(state);

    case "togglePause":
      switch (state.kind) {
        case "playing":
          return unchanged(State.paused({ world: state.world }));
        case "paused":
          return playOn(state.world);
        case "over":
          return unchanged(state);
        default:
          return assertNever(state);
      }

    case "restart":
      return unchanged(newGame(state.world.board, state.world.rng));

    default:
      return assertNever(command);
  }
};
