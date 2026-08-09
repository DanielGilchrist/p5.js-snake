import * as Board from "../core/board";
import * as Snake from "../core/snake";
import * as Layout from "./layout";
import * as Units from "./units";

export type Joint = { readonly at: Units.Point; readonly along: number };

const joint = (at: Units.Point, along: number): Joint => ({ at, along });

const EDGE = 1e-6;

const pointAt = (
  track: readonly Units.Point[],
  fallback: Units.Point,
  distance: number,
): Units.Point => {
  const clamped = Math.min(Math.max(distance, 0), track.length - 1);
  const index = Math.floor(clamped);
  const from = track[index] ?? fallback;
  const to = track[index + 1] ?? from;

  return Layout.lerp(from, to, clamped - index);
};

const sliceTrack = (
  track: readonly Units.Point[],
  fallback: Units.Point,
  from: number,
  to: number,
): readonly Joint[] => {
  const span = Math.max(to - from, EDGE);
  const cut = (distance: number): Joint =>
    joint(pointAt(track, fallback, distance), (distance - from) / span);
  const spine: Joint[] = [cut(from)];

  for (let i = Math.ceil(from + EDGE); i < to - EDGE; i++) spine.push(cut(i));

  spine.push(cut(to));

  return spine;
};

const resting = <B>(snake: Snake.State<B>, layout: Layout.Metrics): readonly Joint[] => {
  const cells = Snake.segments(snake);
  const last = Math.max(cells.length - 1, 1);

  return cells.map((cell, index) => joint(Layout.centreOf(layout, cell), index / last));
};

export const of = <B>(
  snake: Snake.State<B>,
  previous: Snake.State<B>,
  blend: number,
  layout: Layout.Metrics,
): readonly Joint[] => {
  if (Board.equals(snake.head, previous.head)) return resting(snake, layout);

  const track = [snake.head, ...Snake.segments(previous)].map((cell) =>
    Layout.centreOf(layout, cell),
  );
  const fallback = Layout.centreOf(layout, snake.head);
  const grew = Snake.length(snake) > Snake.length(previous);

  return sliceTrack(track, fallback, 1 - blend, track.length - 1 - (grew ? 0 : blend));
};
