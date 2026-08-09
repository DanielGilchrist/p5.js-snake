import * as Board from "../board";
import * as Assert from "../assert";
import type * as Command from "./command";
import * as Event from "../event";
import * as Food from "../food";
import type * as Geometry from "../geometry";
import * as Option from "../option";
import * as Rng from "../rng";
import * as Snake from "../snake";
import * as Turns from "../turns";
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
      turns: Turns.EMPTY,
    }),
  });
};

const steer = <B>(
  world: World.Type<B>,
  direction: Geometry.Direction,
): readonly Event.Type<B>[] => {
  const queued = Turns.steer(world.turns, world.snake.facing, direction);

  return queued.some ? [Event.steered(world, queued.value)] : [];
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
  const turn = Turns.next(world.turns);
  const steering: readonly Event.Type<B>[] = turn.some
    ? [Event.faced(world, turn.value), Event.steered(world, Turns.rest(world.turns))]
    : [];
  const facing = turn.some ? Snake.face(world.snake, turn.value) : world.snake;
  const moved = Snake.advance(api, facing);

  if (moved.kind === "hitWall") {
    return [...steering, Event.ended("collision", facing.head)];
  }

  const motion = Event.moved(moved.to, moved.dropped);
  const snake = Snake.march(facing, moved.to, moved.dropped);

  if (Snake.biteSelf(snake)) {
    return [...steering, motion, Event.ended("collision", snake.head)];
  }

  return Board.equals(snake.head, world.food)
    ? [...steering, motion, ...feed(world, snake, snake.head)]
    : [...steering, motion];
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
