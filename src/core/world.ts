import type * as Board from "./board";
import type * as Brand from "./brand";
import type * as Geometry from "./geometry";
import type * as Option from "./option";
import type * as Rng from "./rng";
import type * as Snake from "./snake";

export type Variant = Brand.Of<number, "Variant">;

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
