import type * as Board from "../core/board";
import type * as Units from "../render/units";

const SLOWEST_PER_SECOND = 10;
const SPEED_UP_PER_POINT = 2;
const FASTEST_SHARE = 0.55;
const CELLS_PER_TICK = 4.3;
const HITSTOP_MS = 130;

export type Clock = {
  readonly restful: number;
  readonly briskest: number;
  beatAt: number;
  holding: number;
};

export const of = <B>(board: Board.Grid<B>): Clock => {
  const restful =
    1000 / Math.max(SLOWEST_PER_SECOND, Math.floor((board.cols + board.rows) / CELLS_PER_TICK));

  return { restful, briskest: restful * FASTEST_SHARE, beatAt: 0, holding: 0 };
};

export const gapFor = (clock: Clock, score: number): number =>
  Math.max(clock.briskest, clock.restful - score * SPEED_UP_PER_POINT);

export const due = (clock: Clock, now: Units.Millis, score: number): boolean =>
  now - clock.beatAt >= Math.max(gapFor(clock, score), clock.holding);

export const beat = (clock: Clock, now: Units.Millis): void => {
  clock.beatAt = now;
  clock.holding = 0;
};

export const waitAt = (clock: Clock, now: Units.Millis): void => {
  clock.beatAt = now;
};

export const savour = (clock: Clock): void => {
  clock.holding = HITSTOP_MS;
};

export const partway = (clock: Clock, now: Units.Millis, score: number): number =>
  Math.min(1, (now - clock.beatAt) / gapFor(clock, score));
