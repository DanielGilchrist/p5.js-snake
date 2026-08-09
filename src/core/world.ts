import type * as Board from "./board";
import type * as Brand from "./brand";
import type * as Geometry from "./geometry";
import type * as Option from "./option";
import type * as Rng from "./rng";
import type * as Snake from "./snake";

export type Variant = Brand.Of<number, "Variant">;

export const variant = (n: number): Variant => n as Variant;

export type Steering = "ready" | "used";

export type Ending = "collision" | "filled";

export type Type<B> = {
  readonly board: Board.Grid<B>;
  readonly snake: Snake.State<B>;
  readonly food: Board.Cell<B>;
  readonly score: number;
  readonly rng: Rng.State;
  readonly variant: Variant;
  readonly pending: Option.Type<Geometry.Direction>;
  readonly steering: Steering;
};

export const create = <B>(fields: Type<B>): Type<B> => ({ ...fields });

export const withSnake = <B>(world: Type<B>, snake: Snake.State<B>): Type<B> => ({
  ...world,
  snake,
});

export const withFood = <B>(world: Type<B>, food: Board.Cell<B>): Type<B> => ({ ...world, food });

export const withScore = <B>(world: Type<B>, score: number): Type<B> => ({ ...world, score });

export const withRng = <B>(world: Type<B>, rng: Rng.State): Type<B> => ({ ...world, rng });

export const withPending = <B>(
  world: Type<B>,
  pending: Option.Type<Geometry.Direction>,
): Type<B> => ({ ...world, pending });

export const withSteering = <B>(world: Type<B>, steering: Steering): Type<B> => ({
  ...world,
  steering,
});
