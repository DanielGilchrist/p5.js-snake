import * as Geometry from "./geometry";
import * as Option from "./option";

const DEPTH = 2;

export type Queue = readonly Geometry.Direction[];

export const EMPTY: Queue = [];

export const heading = (queue: Queue, facing: Geometry.Direction): Geometry.Direction =>
  queue[queue.length - 1] ?? facing;

export const steer = (
  queue: Queue,
  facing: Geometry.Direction,
  direction: Geometry.Direction,
): Option.Type<Queue> => {
  if (queue.length >= DEPTH) return Option.none;

  const from = heading(queue, facing);

  if (from === direction || Geometry.isReverse(from, direction)) return Option.none;

  return Option.some([...queue, direction]);
};

export const next = (queue: Queue): Option.Type<Geometry.Direction> => {
  const [first] = queue;

  return first === undefined ? Option.none : Option.some(first);
};

export const rest = (queue: Queue): Queue => queue.slice(1);
