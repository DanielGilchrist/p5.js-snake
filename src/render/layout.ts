import type * as Board from "../core/board";
import * as Units from "./units";

export type Metrics = {
  readonly blockWidth: Units.Px;
  readonly origin: Units.Point;
};

const metrics = (blockWidth: Units.Px, origin: Units.Point): Metrics => ({ blockWidth, origin });

export const fit = <B>(
  board: Board.Grid<B>,
  viewport: Units.Viewport,
  blockWidth: Units.Px,
): Metrics =>
  metrics(
    blockWidth,
    Units.point(
      (viewport.width - board.cols * blockWidth) / 2,
      (viewport.height - board.rows * blockWidth) / 2,
    ),
  );

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
