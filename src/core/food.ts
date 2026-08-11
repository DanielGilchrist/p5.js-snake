import type * as Board from "./board";
import * as NonEmpty from "./non-empty";
import * as Option from "./option";
import * as Players from "./players";
import * as Rng from "./rng";
import * as Snake from "./snake";

const taken = <B>(players: Players.Type<B>, cell: Board.Cell<B>): boolean =>
  players.some((player) => Snake.occupies(player.snake, cell));

export const place = <B>(
  board: Board.Grid<B>,
  players: Players.Type<B>,
  rng: Rng.State,
): readonly [Option.Type<Board.Cell<B>>, Rng.State] => {
  const free = NonEmpty.fromArray(board.playable.filter((cell) => !taken(players, cell)));

  if (!free.some) return [Option.none, rng];

  const [cell, next] = Rng.choose(rng, free.value);

  return [Option.some(cell), next];
};
