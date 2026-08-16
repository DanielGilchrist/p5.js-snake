import * as Board from "../core/board";
import * as Units from "./units";

export const TARGET_BLOCK = 34;

const PANEL_ACROSS = 13;
const PANEL_DOWN = 17;
const PANEL_SMALLEST = 22;
const PANEL_LARGEST = 58;

export type Metrics = {
  readonly blockWidth: Units.Px;
  readonly origin: Units.Point;
};

export const metrics = (blockWidth: Units.Px, origin: Units.Point): Metrics => ({
  blockWidth,
  origin,
});

const MIN_COLS = 12;
const MIN_ROWS = 10;
const MIN_ASPECT = 0.5;
const MAX_COLS = 28;
const MAX_ROWS = 18;
const MIN_BLOCK = 22;
const MAX_BLOCK = 64;
const SEARCH = 4;
const SURROUND = 0.035;
const MIN_SURROUND = 18;

const clamp = (n: number, low: number, high: number): number => Math.min(high, Math.max(low, n));

export const panelBlock = (stage: Units.Region): Units.Px =>
  Units.px(
    clamp(
      Math.min(stage.width / PANEL_ACROSS, stage.height / PANEL_DOWN),
      PANEL_SMALLEST,
      PANEL_LARGEST,
    ),
  );

export const desk = (viewport: Units.Viewport): Units.Region => {
  const surround = Math.max(MIN_SURROUND, Math.min(viewport.width, viewport.height) * SURROUND);

  return Units.region({
    left: surround,
    top: surround,
    width: viewport.width - surround * 2,
    height: viewport.height - surround * 2,
  });
};

const blockFor = (available: Units.Viewport, cols: number, rows: number): number =>
  clamp(Math.min(available.width / cols, available.height / rows), MIN_BLOCK, MAX_BLOCK);

const wasteOf = (available: Units.Viewport, cols: number, rows: number): number => {
  const block = blockFor(available, cols, rows);

  return Math.abs(available.width - cols * block) + Math.abs(available.height - rows * block);
};

export const cellsFor = (stage: Units.Region, target: number): Board.GridSize => {
  const available = Units.sizeOf(stage);
  const around = clamp(Math.round(available.width / target), MIN_COLS, MAX_COLS);
  let best = Board.size(around, MIN_ROWS);
  let tightest = Number.POSITIVE_INFINITY;

  for (
    let cols = clamp(around - SEARCH, MIN_COLS, MAX_COLS);
    cols <= Math.min(around + SEARCH, MAX_COLS);
    cols++
  ) {
    const shortest = Math.max(MIN_ROWS, Math.round(cols * MIN_ASPECT));
    const rows = clamp(
      Math.round((available.height * cols) / available.width),
      Math.min(shortest, MAX_ROWS),
      MAX_ROWS,
    );
    const waste = wasteOf(available, cols, rows);

    if (waste < tightest) {
      tightest = waste;
      best = Board.size(cols, rows);
    }
  }

  return best;
};

const shrunkTo = (available: Units.Viewport, cols: number, rows: number): number =>
  Math.min(available.width / cols, available.height / rows, MAX_BLOCK);

export const fit = <B>(board: Board.Grid<B>, stage: Units.Region): Metrics => {
  const block = shrunkTo(Units.sizeOf(stage), board.cols, board.rows);

  return metrics(
    Units.px(block),
    Units.point(
      stage.left + (stage.width - board.cols * block) / 2,
      stage.top + (stage.height - board.rows * block) / 2,
    ),
  );
};

export const toPixels = <B>(layout: Metrics, target: Board.Cell<B>): Units.Point =>
  Units.point(
    layout.origin.x + target.col * layout.blockWidth,
    layout.origin.y + target.row * layout.blockWidth,
  );

export const centreOf = <B>(layout: Metrics, target: Board.Cell<B>): Units.Point => {
  const corner = toPixels(layout, target);

  return Units.point(corner.x + layout.blockWidth / 2, corner.y + layout.blockWidth / 2);
};

export const lerp = (from: Units.Point, to: Units.Point, t: number): Units.Point =>
  Units.point(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
