import * as Board from "./board";
import * as Geometry from "./geometry";
import * as NonEmpty from "./non-empty";
import * as Option from "./option";

export type State<B> = {
  readonly head: Board.Cell<B>;
  readonly tail: readonly Board.Cell<B>[];
  readonly facing: Geometry.Direction;
  readonly growth: number;
};

export type Advance<B> =
  | {
      readonly kind: "moved";
      readonly to: Board.Cell<B>;
      readonly dropped: Option.Type<Board.Cell<B>>;
    }
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

const last = <B>(snake: State<B>): Board.Cell<B> => snake.tail[snake.tail.length - 1] ?? snake.head;

export const face = <B>(snake: State<B>, facing: Geometry.Direction): State<B> => ({
  ...snake,
  facing,
});

export const advance = <B>(api: Board.Api<B>, snake: State<B>): Advance<B> => {
  const moved = api.move(snake.head, snake.facing);

  if (moved.kind === "hitWall") return { kind: "hitWall" };

  return {
    kind: "moved",
    to: moved.cell,
    dropped: snake.growth > 0 ? Option.none : Option.some(last(snake)),
  };
};

export const march = <B>(
  snake: State<B>,
  to: Board.Cell<B>,
  dropped: Option.Type<Board.Cell<B>>,
): State<B> => {
  const trailing = NonEmpty.prepend(snake.head, snake.tail);

  return {
    head: to,
    tail: dropped.some ? trailing.slice(0, -1) : trailing,
    facing: snake.facing,
    growth: dropped.some ? snake.growth : snake.growth - 1,
  };
};

export const retreat = <B>(snake: State<B>, dropped: Option.Type<Board.Cell<B>>): State<B> => {
  const trailing = dropped.some ? [...snake.tail, dropped.value] : snake.tail;

  return {
    head: trailing[0] ?? snake.head,
    tail: trailing.slice(1),
    facing: snake.facing,
    growth: dropped.some ? snake.growth : snake.growth + 1,
  };
};

export const grow = <B>(snake: State<B>): State<B> => ({ ...snake, growth: snake.growth + 1 });

export const shrink = <B>(snake: State<B>): State<B> => ({ ...snake, growth: snake.growth - 1 });

export const occupies = <B>(snake: State<B>, target: Board.Cell<B>): boolean =>
  Board.equals(snake.head, target) || snake.tail.some((s) => Board.equals(s, target));

export const biteSelf = <B>(snake: State<B>): boolean =>
  snake.tail.some((s) => Board.equals(s, snake.head));

export const canFace = <B>(snake: State<B>, direction: Geometry.Direction): boolean =>
  !Geometry.isReverse(snake.facing, direction);
