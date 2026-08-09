import { describe, expect, test } from "bun:test";

import * as Assert from "../core/assert";
import * as Board from "../core/board";
import type * as Game from "../core/game";
import * as Layout from "./layout";
import * as Palette from "./palette";
import * as Units from "./units";

const VIEWPORT: Units.Viewport = { width: Units.px(800), height: Units.px(600) };
const BLOCK = Units.px(20);

const onLayout = <R>(cols: number, rows: number, run: <B>(board: Board.Grid<B>) => R): R => {
  const result = Board.withBoard({ cols, rows }, run);

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

describe("layout", () => {
  test("the board is centred in the viewport", () => {
    onLayout(10, 10, (board) => {
      const layout = Layout.layoutFor(board, VIEWPORT, BLOCK);
      const drawnWidth = board.cols * layout.blockWidth;
      const drawnHeight = board.rows * layout.blockWidth;

      expect(layout.origin.x + drawnWidth / 2).toBe(VIEWPORT.width / 2);
      expect(layout.origin.y + drawnHeight / 2).toBe(VIEWPORT.height / 2);
    });
  });

  test("adjacent cells are exactly one block apart", () => {
    onLayout(10, 10, (board) => {
      const layout = Layout.layoutFor(board, VIEWPORT, BLOCK);
      const [first] = board.playable;
      const right = board.playable.find((c) => c.col === first.col + 1 && c.row === first.row);
      const below = board.playable.find((c) => c.col === first.col && c.row === first.row + 1);

      if (right === undefined || below === undefined)
        Assert.unreachable("fixture needs neighbours");

      expect(Layout.toPixels(layout, right).x - Layout.toPixels(layout, first).x).toBe(
        layout.blockWidth,
      );
      expect(Layout.toPixels(layout, below).y - Layout.toPixels(layout, first).y).toBe(
        layout.blockWidth,
      );
    });
  });

  test("centreOf sits half a block inside the corner", () => {
    onLayout(10, 10, (board) => {
      const layout = Layout.layoutFor(board, VIEWPORT, BLOCK);
      const corner = Layout.toPixels(layout, board.start);
      const centre = Layout.centreOf(layout, board.start);

      expect(centre.x - corner.x).toBe(layout.blockWidth / 2);
      expect(centre.y - corner.y).toBe(layout.blockWidth / 2);
    });
  });

  test("every playable cell lands inside the viewport", () => {
    onLayout(10, 10, (board) => {
      const layout = Layout.layoutFor(board, VIEWPORT, BLOCK);

      for (const cell of board.playable) {
        const at = Layout.toPixels(layout, cell);

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
      const tinted: number = Palette.floorTint(n as Game.Variant);

      expect(tinted).toBeGreaterThanOrEqual(-10);
      expect(tinted).toBeLessThanOrEqual(10);
    }
  });

  test("different variants can produce different tints", () => {
    const tints = new Set(
      Array.from({ length: 20 }, (_, n) => Palette.floorTint(n as Game.Variant)),
    );

    expect(tints.size).toBeGreaterThan(1);
  });
});
