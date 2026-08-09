import type * as Board from "../core/board";
import * as Units from "./units";

export type Metrics = {
  readonly blockWidth: Units.Px;
  readonly origin: Units.Point;
};

export const layoutFor = <B>(
  board: Board.Grid<B>,
  viewport: Units.Viewport,
  blockWidth: Units.Px,
): Metrics => ({
  blockWidth,
  origin: {
    x: Units.px((viewport.width - board.cols * blockWidth) / 2),
    y: Units.px((viewport.height - board.rows * blockWidth) / 2),
  },
});

export const toPixels = <B>(layout: Metrics, target: Board.Cell<B>): Units.Point => ({
  x: Units.px(layout.origin.x + target.col * layout.blockWidth),
  y: Units.px(layout.origin.y + target.row * layout.blockWidth),
});

export const centreOf = <B>(layout: Metrics, target: Board.Cell<B>): Units.Point => {
  const corner = toPixels(layout, target);

  return {
    x: Units.px(corner.x + layout.blockWidth / 2),
    y: Units.px(corner.y + layout.blockWidth / 2),
  };
};
