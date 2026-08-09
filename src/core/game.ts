import * as Board from "./board";
import type * as Brand from "./brand";
import * as Assert from "./assert";
import type * as Geometry from "./geometry";
import * as NonEmpty from "./non-empty";
import * as Option from "./option";
import * as Rng from "./rng";
import * as Snake from "./snake";

export type Variant = Brand.Of<number, "Variant">;

const variant = (n: number): Variant => n as Variant;

export type World<B> = {
  readonly board: Board.Grid<B>;
  readonly snake: Snake.State<B>;
  readonly food: Board.Cell<B>;
  readonly score: number;
  readonly rng: Rng.State;
  readonly variant: Variant;
  readonly buffered: readonly Geometry.Direction[];
};

export type Ending = "collision" | "filled";

export type State<B> =
  | { readonly kind: "playing"; readonly world: World<B> }
  | { readonly kind: "paused"; readonly world: World<B> }
  | { readonly kind: "over"; readonly world: World<B>; readonly ending: Ending };

export type Command =
  | { readonly kind: "tick" }
  | { readonly kind: "turn"; readonly direction: Geometry.Direction }
  | { readonly kind: "togglePause" }
  | { readonly kind: "restart" };

export type Event<B> =
  | { readonly kind: "ate"; readonly at: Board.Cell<B> }
  | { readonly kind: "died"; readonly at: Board.Cell<B> };

export type Step<B> = {
  readonly state: State<B>;
  readonly events: readonly Event<B>[];
};

type StateKind = State<never>["kind"];
type StateFields<B, K extends StateKind> = Omit<Extract<State<B>, { kind: K }>, "kind">;

const State = {
  playing: <B>(fields: StateFields<B, "playing">): State<B> => ({ kind: "playing", ...fields }),
  paused: <B>(fields: StateFields<B, "paused">): State<B> => ({ kind: "paused", ...fields }),
  over: <B>(fields: StateFields<B, "over">): State<B> => ({ kind: "over", ...fields }),
} satisfies Record<StateKind, unknown>;

type EventKind = Event<never>["kind"];
type EventFields<B, K extends EventKind> = Omit<Extract<Event<B>, { kind: K }>, "kind">;

const Event = {
  ate: <B>(fields: EventFields<B, "ate">): Event<B> => ({ kind: "ate", ...fields }),
  died: <B>(fields: EventFields<B, "died">): Event<B> => ({ kind: "died", ...fields }),
} satisfies Record<EventKind, unknown>;

const unchanged = <B>(state: State<B>): Step<B> => ({ state, events: [] });

const playOn = <B>(world: World<B>): Step<B> => ({ state: State.playing({ world }), events: [] });

const dieAt = <B>(world: World<B>, at: Board.Cell<B>): Step<B> => ({
  state: State.over({ world, ending: "collision" }),
  events: [Event.died({ at })],
});

const eatAt = <B>(world: World<B>, at: Board.Cell<B>): Step<B> => ({
  state: State.playing({ world }),
  events: [Event.ate({ at })],
});

const winAt = <B>(world: World<B>, at: Board.Cell<B>): Step<B> => ({
  state: State.over({ world, ending: "filled" }),
  events: [Event.ate({ at })],
});

const withSnake = <B>(world: World<B>, snake: Snake.State<B>): World<B> => ({ ...world, snake });

const withFood = <B>(world: World<B>, food: Board.Cell<B>, rng: Rng.State): World<B> => ({
  ...world,
  food,
  rng,
});

const withRng = <B>(world: World<B>, rng: Rng.State): World<B> => ({ ...world, rng });

const scored = <B>(world: World<B>): World<B> => ({ ...world, score: world.score + 1 });

const MAX_BUFFERED = 2;
const VARIANTS = 20;

const freeCell = <B>(
  board: Board.Grid<B>,
  snake: Snake.State<B>,
  state: Rng.State,
): readonly [Option.Type<Board.Cell<B>>, Rng.State] => {
  const candidates = NonEmpty.fromArray(
    board.playable.filter((cell) => !Snake.occupies(snake, cell)),
  );

  if (!candidates.some) return [Option.none, state];

  const [cell, next] = Rng.choose(state, candidates.value);

  return [Option.some(cell), next];
};

export const start = <B>(board: Board.Grid<B>, state: Rng.State): State<B> => {
  const snake = Snake.spawn(board.start, "right");
  const [drawn, seeded] = Rng.nextInt(state, VARIANTS);
  const [food, next] = freeCell(board, snake, seeded);

  return State.playing({
    world: {
      board,
      snake,
      food: Option.getOrElse(food, board.start),
      score: 0,
      rng: next,
      variant: variant(drawn),
      buffered: [],
    },
  });
};

const bufferTurn = <B>(world: World<B>, direction: Geometry.Direction): World<B> =>
  world.buffered.length >= MAX_BUFFERED
    ? world
    : { ...world, buffered: [...world.buffered, direction] };

const applyBufferedTurn = <B>(world: World<B>): World<B> => {
  const [next, ...rest] = world.buffered;

  return next === undefined
    ? world
    : { ...world, snake: Snake.turn(world.snake, next), buffered: rest };
};

const eat = <B>(world: World<B>, snake: Snake.State<B>): Step<B> => {
  const fed = Snake.grow(snake);
  const [next, rng] = freeCell(world.board, fed, world.rng);
  const grown = scored(withSnake(world, fed));

  return next.some
    ? eatAt(withFood(grown, next.value, rng), snake.head)
    : winAt(withRng(grown, rng), snake.head);
};

const tick = <B>(api: Board.Api<B>, world: World<B>): Step<B> => {
  const steered = applyBufferedTurn(world);
  const moved = Snake.advance(api, steered.snake);

  if (moved.kind === "hitWall") return dieAt(steered, steered.snake.head);

  const { snake } = moved;

  if (Snake.biteSelf(snake)) return dieAt(withSnake(steered, snake), snake.head);

  return Board.equals(snake.head, steered.food)
    ? eat(steered, snake)
    : playOn(withSnake(steered, snake));
};

export const step = <B>(api: Board.Api<B>, state: State<B>, command: Command): Step<B> => {
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
          return Assert.never(state);
      }

    case "restart":
      return unchanged(start(state.world.board, state.world.rng));

    default:
      return Assert.never(command);
  }
};
