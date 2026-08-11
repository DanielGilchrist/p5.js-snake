import * as Board from "./board";
import type * as Geometry from "./geometry";
import * as Option from "./option";
import * as Players from "./players";
import * as Snake from "./snake";
import * as Turns from "./turns";
import type * as World from "./world";

const HEADINGS: readonly Geometry.Direction[] = ["up", "down", "left", "right"];

const crowded = <B>(world: World.Type<B>, cell: Board.Cell<B>): boolean =>
  world.players.some((player) => player.alive && Snake.occupies(player.snake, cell));

const landing = <B>(
  api: Board.Api<B>,
  world: World.Type<B>,
  from: Board.Cell<B>,
  heading: Geometry.Direction,
): Option.Type<Board.Cell<B>> => {
  const moved = api.move(from, heading);

  if (moved.kind === "hitWall") return Option.none;

  return crowded(world, moved.cell) ? Option.none : Option.some(moved.cell);
};

const gap = <B>(a: Board.Cell<B>, b: Board.Cell<B>): number =>
  Math.abs(a.col - b.col) + Math.abs(a.row - b.row);

export const choose = <B>(
  api: Board.Api<B>,
  world: World.Type<B>,
  who: Players.Id,
): Option.Type<Geometry.Direction> => {
  const sitting = Players.at(world.players, who);

  if (!sitting.some || !sitting.value.alive) return Option.none;

  const { snake, turns } = sitting.value;
  const staying = landing(api, world, snake.head, Turns.facingAfter(turns, snake.facing));

  let picked: Option.Type<Geometry.Direction> = Option.none;
  let closest = staying.some ? gap(staying.value, world.food) : Number.POSITIVE_INFINITY;

  for (const heading of HEADINGS) {
    if (!Turns.accept(turns, snake.facing, heading).some) continue;

    const next = landing(api, world, snake.head, heading);

    if (!next.some) continue;

    const reach = gap(next.value, world.food);

    if (reach < closest) {
      closest = reach;
      picked = Option.some(heading);
    }
  }

  return picked;
};
