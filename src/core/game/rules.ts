import * as Board from "../board";
import * as Assert from "../assert";
import type * as Event from "../event";
import * as Food from "../food";
import type * as Geometry from "../geometry";
import * as Option from "../option";
import * as Rng from "../rng";
import * as Snake from "../snake";
import type * as World from "../world";
import * as State from "./state";

export type Command =
  | { readonly kind: "tick" }
  | { readonly kind: "turn"; readonly direction: Geometry.Direction }
  | { readonly kind: "togglePause" }
  | { readonly kind: "restart" };

const VARIANTS = 20;

export const start = <B>(board: Board.Grid<B>, rng: Rng.State): State.Type<B> => {
  const snake = Snake.spawn(board.start, "right");
  const [drawn, seeded] = Rng.nextInt(rng, VARIANTS);
  const [food, next] = Food.place(board, snake, seeded);

  return State.playing({
    world: {
      board,
      snake,
      food: Option.getOrElse(food, board.start),
      score: 0,
      rng: next,
      variant: drawn as World.Variant,
      pending: Option.none,
      steering: "ready",
    },
  });
};

const steer = <B>(
  world: World.Type<B>,
  direction: Geometry.Direction,
): readonly Event.Type<B>[] => {
  switch (world.steering) {
    case "used":
      return [{ kind: "queued", from: world.pending, to: Option.some(direction) }];

    case "ready": {
      const turn: readonly Event.Type<B>[] = Snake.canFace(world.snake, direction)
        ? [{ kind: "faced", from: world.snake.facing, to: direction }]
        : [];

      return [...turn, { kind: "steered", from: "ready", to: "used" }];
    }

    default:
      return Assert.never(world.steering);
  }
};

const release = <B>(world: World.Type<B>): readonly Event.Type<B>[] => {
  const target: World.Steering = world.pending.some ? "used" : "ready";
  const steered: readonly Event.Type<B>[] =
    world.steering === target ? [] : [{ kind: "steered", from: world.steering, to: target }];

  if (!world.pending.some) return steered;

  const direction = world.pending.value;
  const turn: readonly Event.Type<B>[] = Snake.canFace(world.snake, direction)
    ? [{ kind: "faced", from: world.snake.facing, to: direction }]
    : [];

  return [...turn, { kind: "queued", from: world.pending, to: Option.none }, ...steered];
};

const feed = <B>(
  world: World.Type<B>,
  snake: Snake.State<B>,
  at: Board.Cell<B>,
): readonly Event.Type<B>[] => {
  const [next, rng] = Food.place(world.board, snake, world.rng);
  const rolled: Event.Type<B> = { kind: "rolled", from: world.rng, to: rng };

  return next.some
    ? [
        { kind: "grew" },
        { kind: "scored", at },
        { kind: "fed", from: world.food, to: next.value },
        rolled,
      ]
    : [{ kind: "grew" }, { kind: "scored", at }, rolled, { kind: "ended", ending: "filled", at }];
};

const tick = <B>(api: Board.Api<B>, world: World.Type<B>): readonly Event.Type<B>[] => {
  const moved = Snake.advance(api, world.snake);

  if (moved.kind === "hitWall") {
    return [{ kind: "ended", ending: "collision", at: world.snake.head }];
  }

  const motion: Event.Type<B> = { kind: "moved", to: moved.to, dropped: moved.dropped };
  const snake = Snake.march(world.snake, moved.to, moved.dropped);

  if (Snake.biteSelf(snake)) {
    return [motion, { kind: "ended", ending: "collision", at: snake.head }];
  }

  const steering = release(world);

  return Board.equals(snake.head, world.food)
    ? [motion, ...steering, ...feed(world, snake, snake.head)]
    : [motion, ...steering];
};

export const decide = <B>(
  api: Board.Api<B>,
  state: State.Type<B>,
  command: Command,
): readonly Event.Type<B>[] => {
  switch (command.kind) {
    case "tick":
      return state.kind === "playing" ? tick(api, state.world) : [];

    case "turn":
      return state.kind === "playing" ? steer(state.world, command.direction) : [];

    case "togglePause":
      switch (state.kind) {
        case "playing":
          return [{ kind: "paused" }];
        case "paused":
          return [{ kind: "resumed" }];
        case "over":
          return [];
        default:
          return Assert.never(state);
      }

    case "restart":
      return [];

    default:
      return Assert.never(command);
  }
};
