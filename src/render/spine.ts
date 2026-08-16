import * as Board from "../core/board";
import * as Snake from "../core/snake";
import type * as Layout from "./layout";

const STRIDE = 3;

export type Spine = {
  readonly values: Float64Array;
  readonly count: number;
};

export const count = (spine: Spine): number => spine.count;

export const xAt = (spine: Spine, index: number): number => spine.values[index * STRIDE] ?? 0;

export const yAt = (spine: Spine, index: number): number => spine.values[index * STRIDE + 1] ?? 0;

export const alongAt = (spine: Spine, index: number): number =>
  spine.values[index * STRIDE + 2] ?? 0;

const EDGE = 1e-6;
const STRAIGHT = 1e-6;

export const straight = (
  fromX: number,
  fromY: number,
  byX: number,
  byY: number,
  toX: number,
  toY: number,
): boolean => Math.abs((byX - fromX) * (toY - byY) - (byY - fromY) * (toX - byX)) <= STRAIGHT;

const centreX = <B>(layout: Layout.Metrics, cell: Board.Cell<B>): number =>
  layout.origin.x + cell.col * layout.blockWidth + layout.blockWidth / 2;

const centreY = <B>(layout: Layout.Metrics, cell: Board.Cell<B>): number =>
  layout.origin.y + cell.row * layout.blockWidth + layout.blockWidth / 2;

const resting = <B>(snake: Snake.State<B>, layout: Layout.Metrics): Spine => {
  const cells = Snake.segments(snake);
  const last = Math.max(cells.length - 1, 1);
  const values = new Float64Array(cells.length * STRIDE);

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    if (cell === undefined) continue;

    values[i * STRIDE] = centreX(layout, cell);
    values[i * STRIDE + 1] = centreY(layout, cell);
    values[i * STRIDE + 2] = i / last;
  }

  return { values, count: cells.length };
};

const trackFor = <B>(
  snake: Snake.State<B>,
  previous: Snake.State<B>,
  layout: Layout.Metrics,
): Float64Array => {
  const tail = previous.tail;
  const track = new Float64Array((tail.length + 2) * 2);

  track[0] = centreX(layout, snake.head);
  track[1] = centreY(layout, snake.head);
  track[2] = centreX(layout, previous.head);
  track[3] = centreY(layout, previous.head);

  for (let i = 0; i < tail.length; i++) {
    const cell = tail[i];

    if (cell === undefined) continue;

    track[(i + 2) * 2] = centreX(layout, cell);
    track[(i + 2) * 2 + 1] = centreY(layout, cell);
  }

  return track;
};

const cutsFor = (from: number, to: number): number => {
  const first = Math.ceil(from + EDGE);
  const last = Math.ceil(to - EDGE);

  return 2 + Math.max(0, last - first);
};

const sliced = (track: Float64Array, from: number, to: number): Spine => {
  const stops = track.length / 2;
  const span = Math.max(to - from, EDGE);
  const values = new Float64Array(cutsFor(from, to) * STRIDE);
  let slot = 0;

  const cut = (distance: number): void => {
    const clamped = Math.min(Math.max(distance, 0), stops - 1);
    const index = Math.floor(clamped);
    const next = Math.min(index + 1, stops - 1);
    const t = clamped - index;
    const fromX = track[index * 2] ?? 0;
    const fromY = track[index * 2 + 1] ?? 0;

    values[slot * STRIDE] = fromX + ((track[next * 2] ?? 0) - fromX) * t;
    values[slot * STRIDE + 1] = fromY + ((track[next * 2 + 1] ?? 0) - fromY) * t;
    values[slot * STRIDE + 2] = (distance - from) / span;
    slot += 1;
  };

  cut(from);

  for (let i = Math.ceil(from + EDGE); i < to - EDGE; i++) cut(i);

  cut(to);

  return { values, count: slot };
};

export const of = <B>(
  snake: Snake.State<B>,
  previous: Snake.State<B>,
  blend: number,
  layout: Layout.Metrics,
): Spine => {
  if (Board.equals(snake.head, previous.head)) return resting(snake, layout);

  const track = trackFor(snake, previous, layout);
  const grew = Snake.length(snake) > Snake.length(previous);

  return sliced(track, 1 - blend, track.length / 2 - 1 - (grew ? 0 : blend));
};
