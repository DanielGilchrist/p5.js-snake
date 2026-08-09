import type * as Board from "./board";
import * as Assert from "./assert";
import type * as Geometry from "./geometry";
import type * as Option from "./option";
import type * as Rng from "./rng";
import * as Snake from "./snake";
import type * as Turns from "./turns";
import * as World from "./world";

type Change<B> =
  | { readonly kind: "faced"; readonly from: Geometry.Direction; readonly to: Geometry.Direction }
  | { readonly kind: "steered"; readonly from: Turns.Queue; readonly to: Turns.Queue }
  | {
      readonly kind: "moved";
      readonly to: Board.Cell<B>;
      readonly dropped: Option.Type<Board.Cell<B>>;
    }
  | { readonly kind: "grew" }
  | { readonly kind: "scored"; readonly at: Board.Cell<B> }
  | { readonly kind: "fed"; readonly from: Board.Cell<B>; readonly to: Board.Cell<B> }
  | { readonly kind: "rolled"; readonly from: Rng.State; readonly to: Rng.State };

type Lifecycle<B> =
  | { readonly kind: "paused" }
  | { readonly kind: "resumed" }
  | { readonly kind: "ended"; readonly ending: World.Ending; readonly at: Board.Cell<B> };

export type Type<B> = Change<B> | Lifecycle<B>;

export const faced = <B>(world: World.Type<B>, to: Geometry.Direction): Type<B> => ({
  kind: "faced",
  from: world.snake.facing,
  to,
});

export const steered = <B>(world: World.Type<B>, to: Turns.Queue): Type<B> => ({
  kind: "steered",
  from: world.turns,
  to,
});

export const fed = <B>(world: World.Type<B>, to: Board.Cell<B>): Type<B> => ({
  kind: "fed",
  from: world.food,
  to,
});

export const rolled = <B>(world: World.Type<B>, to: Rng.State): Type<B> => ({
  kind: "rolled",
  from: world.rng,
  to,
});

export const moved = <B>(to: Board.Cell<B>, dropped: Option.Type<Board.Cell<B>>): Type<B> => ({
  kind: "moved",
  to,
  dropped,
});

export const scored = <B>(at: Board.Cell<B>): Type<B> => ({ kind: "scored", at });

export const ended = <B>(ending: World.Ending, at: Board.Cell<B>): Type<B> => ({
  kind: "ended",
  ending,
  at,
});

export const grew = { kind: "grew" } as const;

export const paused = { kind: "paused" } as const;

export const resumed = { kind: "resumed" } as const;

export const forward = <B>(world: World.Type<B>, change: Change<B>): World.Type<B> => {
  switch (change.kind) {
    case "faced":
      return World.withSnake(world, Snake.face(world.snake, change.to));
    case "steered":
      return World.withTurns(world, change.to);
    case "moved":
      return World.withSnake(world, Snake.march(world.snake, change.to, change.dropped));
    case "grew":
      return World.withSnake(world, Snake.grow(world.snake));
    case "scored":
      return World.withScore(world, world.score + 1);
    case "fed":
      return World.withFood(world, change.to);
    case "rolled":
      return World.withRng(world, change.to);
    default:
      return Assert.never(change);
  }
};

export const backward = <B>(world: World.Type<B>, change: Change<B>): World.Type<B> => {
  switch (change.kind) {
    case "faced":
      return World.withSnake(world, Snake.face(world.snake, change.from));
    case "steered":
      return World.withTurns(world, change.from);
    case "moved":
      return World.withSnake(world, Snake.retreat(world.snake, change.dropped));
    case "grew":
      return World.withSnake(world, Snake.shrink(world.snake));
    case "scored":
      return World.withScore(world, world.score - 1);
    case "fed":
      return World.withFood(world, change.from);
    case "rolled":
      return World.withRng(world, change.from);
    default:
      return Assert.never(change);
  }
};
