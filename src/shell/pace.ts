import type * as Board from "../core/board";
import type * as Units from "../render/units";

const SLOWEST_PER_SECOND = 10;
const CELLS_PER_TICK = 4.3;
const SPEED_UP_MS = 2;
const FASTEST_SHARE = 0.55;
const HITSTOP_MS = 130;

export type Pace = {
  readonly restful: number;
  readonly briskest: number;
};

export const of = <B>(board: Board.Grid<B>): Pace => {
  const restful =
    1000 / Math.max(SLOWEST_PER_SECOND, Math.floor((board.cols + board.rows) / CELLS_PER_TICK));

  return { restful, briskest: restful * FASTEST_SHARE };
};

export const gapFor = (pace: Pace, score: number): number =>
  Math.max(pace.briskest, pace.restful - score * SPEED_UP_MS);

export const topSpeedAt = (pace: Pace): number =>
  Math.ceil((pace.restful - pace.briskest) / SPEED_UP_MS);

export const savour = (): number => HITSTOP_MS;

export const due = (pace: Pace, since: Units.Millis, score: number, holding: number): boolean =>
  since >= Math.max(gapFor(pace, score), holding);

export const partway = (pace: Pace, since: Units.Millis, score: number): number =>
  Math.min(1, since / gapFor(pace, score));
