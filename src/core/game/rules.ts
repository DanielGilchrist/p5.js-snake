import * as Board from "../board";
import * as Assert from "../assert";
import type * as Command from "./command";
import * as Event from "../event";
import * as Food from "../food";
import type * as Geometry from "../geometry";
import * as Option from "../option";
import * as Rng from "../rng";
import * as Snake from "../snake";
import * as World from "../world";
import * as State from "./state";

const VARIANTS = 20;

export const start = <B>(board: Board.Grid<B>, rng: Rng.State): State.Type<B> => {
  const snake = Snake.spawn(board.start, "right");
  const [drawn, seeded] = Rng.nextInt(rng, VARIANTS);
  const [food, next] = Food.place(board, snake, seeded);

  return State.playing({
    world: World.create({
      board,
      snake,
      food: Option.getOrElse(food, board.start),
      score: 0,
      rng: next,
      variant: World.variant(drawn),
      pending: Option.none,
      steering: "ready",
    }),
  });
};

const steer = <B>(
  world: World.Type<B>,
  direction: Geometry.Direction,
): readonly Event.Type<B>[] => {
  switch (world.steering) {
    case "used":
      return [Event.queued(world, Option.some(direction))];

    case "ready": {
      const turn: readonly Event.Type<B>[] = Snake.canFace(world.snake, direction)
        ? [Event.faced(world, direction)]
        : [];

      return [...turn, Event.steered(world, "used")];
    }

    default:
      return Assert.never(world.steering);
  }
};

const release = <B>(world: World.Type<B>): readonly Event.Type<B>[] => {
  const target: World.Steering = world.pending.some ? "used" : "ready";
  const steered: readonly Event.Type<B>[] =
    world.steering === target ? [] : [Event.steered(world, target)];

  if (!world.pending.some) return steered;

  const direction = world.pending.value;
  const turn: readonly Event.Type<B>[] = Snake.canFace(world.snake, direction)
    ? [Event.faced(world, direction)]
    : [];

  return [...turn, Event.queued(world, Option.none), ...steered];
};

const feed = <B>(
  world: World.Type<B>,
  snake: Snake.State<B>,
  at: Board.Cell<B>,
): readonly Event.Type<B>[] => {
  const [next, rng] = Food.place(world.board, snake, world.rng);
  const rolled = Event.rolled(world, rng);

  return next.some
    ? [Event.grew, Event.scored(at), Event.fed(world, next.value), rolled]
    : [Event.grew, Event.scored(at), rolled, Event.ended("filled", at)];
};

const tick = <B>(api: Board.Api<B>, world: World.Type<B>): readonly Event.Type<B>[] => {
  const moved = Snake.advance(api, world.snake);

  if (moved.kind === "hitWall") {
    return [Event.ended("collision", world.snake.head)];
  }

  const motion = Event.moved(moved.to, moved.dropped);
  const snake = Snake.march(world.snake, moved.to, moved.dropped);

  if (Snake.biteSelf(snake)) {
    return [motion, Event.ended("collision", snake.head)];
  }

  const steering = release(world);

  return Board.equals(snake.head, world.food)
    ? [motion, ...steering, ...feed(world, snake, snake.head)]
    : [motion, ...steering];
};

export const decide = <B>(
  api: Board.Api<B>,
  state: State.Type<B>,
  command: Command.Type,
): readonly Event.Type<B>[] => {
  switch (command.kind) {
    case "tick":
      return state.kind === "playing" ? tick(api, state.world) : [];

    case "turn":
      return state.kind === "playing" ? steer(state.world, command.direction) : [];

    case "togglePause":
      switch (state.kind) {
        case "playing":
          return [Event.paused];
        case "paused":
          return [Event.resumed];
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
