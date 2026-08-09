import type * as Board from "./board";
import * as NonEmpty from "./non-empty";
import * as Option from "./option";
import * as Rng from "./rng";
import * as Snake from "./snake";

export const place = <B>(
  board: Board.Grid<B>,
  snake: Snake.State<B>,
  rng: Rng.State,
): readonly [Option.Type<Board.Cell<B>>, Rng.State] => {
  const free = NonEmpty.fromArray(board.playable.filter((cell) => !Snake.occupies(snake, cell)));

  if (!free.some) return [Option.none, rng];

  const [cell, next] = Rng.choose(rng, free.value);

  return [Option.some(cell), next];
};
