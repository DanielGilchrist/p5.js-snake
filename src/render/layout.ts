import type { Board, Cell } from "../core/board";
import { px, type Point, type Px, type Viewport } from "./units";

export type Layout = {
  readonly blockWidth: Px;
  readonly origin: Point;
};

export const layoutFor = <B>(board: Board<B>, viewport: Viewport, blockWidth: Px): Layout => ({
  blockWidth,
  origin: {
    x: px((viewport.width - board.cols * blockWidth) / 2),
    y: px((viewport.height - board.rows * blockWidth) / 2),
  },
});

export const toPixels = <B>(layout: Layout, target: Cell<B>): Point => ({
  x: px(layout.origin.x + target.col * layout.blockWidth),
  y: px(layout.origin.y + target.row * layout.blockWidth),
});

export const centreOf = <B>(layout: Layout, target: Cell<B>): Point => {
  const corner = toPixels(layout, target);

  return {
    x: px(corner.x + layout.blockWidth / 2),
    y: px(corner.y + layout.blockWidth / 2),
  };
};
