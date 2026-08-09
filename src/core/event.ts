import type * as Board from "./board";
import * as Assert from "./assert";
import type * as Geometry from "./geometry";
import type * as Option from "./option";
import type * as Rng from "./rng";
import * as Snake from "./snake";
import type * as World from "./world";

export type Change<B> =
  | { readonly kind: "faced"; readonly from: Geometry.Direction; readonly to: Geometry.Direction }
  | {
      readonly kind: "queued";
      readonly from: Option.Type<Geometry.Direction>;
      readonly to: Option.Type<Geometry.Direction>;
    }
  | { readonly kind: "steered"; readonly from: World.Steering; readonly to: World.Steering }
  | {
      readonly kind: "moved";
      readonly to: Board.Cell<B>;
      readonly dropped: Option.Type<Board.Cell<B>>;
    }
  | { readonly kind: "grew" }
  | { readonly kind: "scored"; readonly at: Board.Cell<B> }
  | { readonly kind: "fed"; readonly from: Board.Cell<B>; readonly to: Board.Cell<B> }
  | { readonly kind: "rolled"; readonly from: Rng.State; readonly to: Rng.State };

export type Lifecycle<B> =
  | { readonly kind: "paused" }
  | { readonly kind: "resumed" }
  | { readonly kind: "ended"; readonly ending: World.Ending; readonly at: Board.Cell<B> };

export type Type<B> = Change<B> | Lifecycle<B>;

export const forward = <B>(world: World.Type<B>, change: Change<B>): World.Type<B> => {
  switch (change.kind) {
    case "faced":
      return { ...world, snake: Snake.face(world.snake, change.to) };
    case "queued":
      return { ...world, pending: change.to };
    case "steered":
      return { ...world, steering: change.to };
    case "moved":
      return { ...world, snake: Snake.march(world.snake, change.to, change.dropped) };
    case "grew":
      return { ...world, snake: Snake.grow(world.snake) };
    case "scored":
      return { ...world, score: world.score + 1 };
    case "fed":
      return { ...world, food: change.to };
    case "rolled":
      return { ...world, rng: change.to };
    default:
      return Assert.never(change);
  }
};

export const backward = <B>(world: World.Type<B>, change: Change<B>): World.Type<B> => {
  switch (change.kind) {
    case "faced":
      return { ...world, snake: Snake.face(world.snake, change.from) };
    case "queued":
      return { ...world, pending: change.from };
    case "steered":
      return { ...world, steering: change.from };
    case "moved":
      return { ...world, snake: Snake.retreat(world.snake, change.dropped) };
    case "grew":
      return { ...world, snake: Snake.shrink(world.snake) };
    case "scored":
      return { ...world, score: world.score - 1 };
    case "fed":
      return { ...world, food: change.from };
    case "rolled":
      return { ...world, rng: change.from };
    default:
      return Assert.never(change);
  }
};
