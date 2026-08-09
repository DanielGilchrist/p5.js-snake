import { equals, type BoardApi, type Cell } from "./board";
import { isReverse, type Direction } from "./geometry";
import { prepend, type NonEmpty } from "./non-empty";

export type Snake<B> = {
  readonly head: Cell<B>;
  readonly tail: readonly Cell<B>[];
  readonly facing: Direction;
  readonly growth: number;
};

export type Advance<B> =
  | { readonly kind: "moved"; readonly snake: Snake<B> }
  | { readonly kind: "hitWall" };

export const spawn = <B>(at: Cell<B>, facing: Direction): Snake<B> => ({
  head: at,
  tail: [],
  facing,
  growth: 0,
});

export const segments = <B>(snake: Snake<B>): NonEmpty<Cell<B>> => prepend(snake.head, snake.tail);

export const length = <B>(snake: Snake<B>): number => 1 + snake.tail.length;

export const turn = <B>(snake: Snake<B>, direction: Direction): Snake<B> =>
  isReverse(snake.facing, direction) ? snake : { ...snake, facing: direction };

export const advance = <B>(api: BoardApi<B>, snake: Snake<B>): Advance<B> => {
  const moved = api.move(snake.head, snake.facing);

  if (moved.kind === "hitWall") return { kind: "hitWall" };

  const trailing = prepend(snake.head, snake.tail);

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

export const grow = <B>(snake: Snake<B>): Snake<B> => ({
  ...snake,
  growth: snake.growth + 1,
});

export const occupies = <B>(snake: Snake<B>, target: Cell<B>): boolean =>
  equals(snake.head, target) || snake.tail.some((segment) => equals(segment, target));

export const biteSelf = <B>(snake: Snake<B>): boolean =>
  snake.tail.some((segment) => equals(segment, snake.head));
