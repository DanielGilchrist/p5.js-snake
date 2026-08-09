import * as Board from "./board";
import * as Geometry from "./geometry";
import * as NonEmpty from "./non-empty";

export type State<B> = {
  readonly head: Board.Cell<B>;
  readonly tail: readonly Board.Cell<B>[];
  readonly facing: Geometry.Direction;
  readonly growth: number;
};

export type Advance<B> =
  | { readonly kind: "moved"; readonly snake: State<B> }
  | { readonly kind: "hitWall" };

export const spawn = <B>(at: Board.Cell<B>, facing: Geometry.Direction): State<B> => ({
  head: at,
  tail: [],
  facing,
  growth: 0,
});

export const segments = <B>(snake: State<B>): NonEmpty.List<Board.Cell<B>> =>
  NonEmpty.prepend(snake.head, snake.tail);

export const length = <B>(snake: State<B>): number => 1 + snake.tail.length;

export const turn = <B>(snake: State<B>, direction: Geometry.Direction): State<B> =>
  Geometry.isReverse(snake.facing, direction) ? snake : { ...snake, facing: direction };

export const advance = <B>(api: Board.Api<B>, snake: State<B>): Advance<B> => {
  const moved = api.move(snake.head, snake.facing);

  if (moved.kind === "hitWall") return { kind: "hitWall" };

  const trailing = NonEmpty.prepend(snake.head, snake.tail);

  return {
    kind: "moved",
    snake: {
      head: moved.cell,
      tail: snake.growth > 0 ? trailing : trailing.slice(0, -1),
      facing: snake.facing,
      growth: Math.max(0, snake.growth - 1),
    },
  };
};

export const grow = <B>(snake: State<B>): State<B> => ({ ...snake, growth: snake.growth + 1 });

export const occupies = <B>(snake: State<B>, target: Board.Cell<B>): boolean =>
  Board.equals(snake.head, target) || snake.tail.some((s) => Board.equals(s, target));

export const biteSelf = <B>(snake: State<B>): boolean =>
  snake.tail.some((s) => Board.equals(s, snake.head));
