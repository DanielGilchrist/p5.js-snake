import { describe, expect, test } from "bun:test";

import { withBoard, type Board } from "../core/board";
import type { Variant } from "../core/game";
import { centreOf, layoutFor, toPixels } from "./layout";
import { floorTint } from "./palette";
import { px, type Viewport } from "./units";

const VIEWPORT: Viewport = { width: px(800), height: px(600) };
const BLOCK = px(20);

const onLayout = <R>(cols: number, rows: number, run: <B>(board: Board<B>) => R): R => {
  const result = withBoard({ cols, rows }, run);

  if (!result.ok) throw new Error("fixture board must parse");

  return result.value;
};

describe("layout", () => {
  test("the board is centred in the viewport", () => {
    onLayout(10, 10, (board) => {
      const layout = layoutFor(board, VIEWPORT, BLOCK);
      const drawnWidth = board.cols * layout.blockWidth;
      const drawnHeight = board.rows * layout.blockWidth;

      expect(layout.origin.x + drawnWidth / 2).toBe(VIEWPORT.width / 2);
      expect(layout.origin.y + drawnHeight / 2).toBe(VIEWPORT.height / 2);
    });
  });

  test("adjacent cells are exactly one block apart", () => {
    onLayout(10, 10, (board) => {
      const layout = layoutFor(board, VIEWPORT, BLOCK);
      const [first] = board.playable;
      const right = board.playable.find((c) => c.col === first.col + 1 && c.row === first.row);
      const below = board.playable.find((c) => c.col === first.col && c.row === first.row + 1);

      if (right === undefined || below === undefined) throw new Error("fixture needs neighbours");

      expect(toPixels(layout, right).x - toPixels(layout, first).x).toBe(layout.blockWidth);
      expect(toPixels(layout, below).y - toPixels(layout, first).y).toBe(layout.blockWidth);
    });
  });

  test("centreOf sits half a block inside the corner", () => {
    onLayout(10, 10, (board) => {
      const layout = layoutFor(board, VIEWPORT, BLOCK);
      const corner = toPixels(layout, board.start);
      const centre = centreOf(layout, board.start);

      expect(centre.x - corner.x).toBe(layout.blockWidth / 2);
      expect(centre.y - corner.y).toBe(layout.blockWidth / 2);
    });
  });

  test("every playable cell lands inside the viewport", () => {
    onLayout(10, 10, (board) => {
      const layout = layoutFor(board, VIEWPORT, BLOCK);

      for (const cell of board.playable) {
        const at = toPixels(layout, cell);

        expect(at.x).toBeGreaterThanOrEqual(0);
        expect(at.y).toBeGreaterThanOrEqual(0);
        expect(at.x + layout.blockWidth).toBeLessThanOrEqual(VIEWPORT.width);
        expect(at.y + layout.blockWidth).toBeLessThanOrEqual(VIEWPORT.height);
      }
    });
  });
});

describe("palette", () => {
  test("every variant produces a tint within the documented range", () => {
    for (let n = 0; n < 100; n++) {
      const tinted: number = floorTint(n as Variant);

      expect(tinted).toBeGreaterThanOrEqual(-10);
      expect(tinted).toBeLessThanOrEqual(10);
    }
  });

  test("different variants can produce different tints", () => {
    const tints = new Set(Array.from({ length: 20 }, (_, n) => floorTint(n as Variant)));

    expect(tints.size).toBeGreaterThan(1);
  });
});
