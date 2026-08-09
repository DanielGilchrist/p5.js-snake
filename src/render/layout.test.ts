import { describe, expect, test } from "bun:test";

import * as Assert from "../core/assert";
import * as Board from "../core/board";
import type * as World from "../core/world";
import * as Layout from "./layout";
import * as Palette from "./palette";
import * as Units from "./units";

const VIEWPORT = Units.viewport(800, 600);

const onLayout = <R>(cols: number, rows: number, run: <B>(board: Board.Grid<B>) => R): R => {
  const result = Board.parse(Board.size(cols, rows), run);

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

describe("layout", () => {
  const SCREENS = [
    Units.viewport(1512, 982),
    Units.viewport(1920, 1080),
    Units.viewport(2560, 1440),
    Units.viewport(3440, 1440),
    Units.viewport(5120, 2160),
    Units.viewport(1280, 800),
    Units.viewport(390, 844),
  ];

  test("the board stays a comfortable object on every screen", () => {
    for (const screen of SCREENS) {
      const size = Layout.cellsFor(Layout.desk(screen), 34);

      onLayout(size.cols, size.rows, (board) => {
        const layout = Layout.fit(board, Layout.desk(screen));

        expect(layout.blockWidth).toBeGreaterThanOrEqual(22);
        expect(layout.blockWidth).toBeLessThanOrEqual(64);
        expect(board.cols * layout.blockWidth).toBeLessThanOrEqual(screen.width);
        expect(board.rows * layout.blockWidth).toBeLessThanOrEqual(screen.height);
        expect(layout.origin.x).toBeGreaterThanOrEqual(15);
        expect(layout.origin.y).toBeGreaterThanOrEqual(15);
      });
    }
  });

  test("a huge screen does not give a huge board", () => {
    const huge = Units.viewport(5120, 2160);
    const size = Layout.cellsFor(Layout.desk(huge), 34);

    onLayout(size.cols, size.rows, (board) => {
      const layout = Layout.fit(board, Layout.desk(huge));

      expect(board.cols * layout.blockWidth).toBeLessThan(huge.width * 0.5);
      expect(board.cols).toBeLessThanOrEqual(28);
      expect(board.rows).toBeLessThanOrEqual(18);
    });
  });

  test("the board keeps a playable aspect on an ultrawide", () => {
    const wide = Units.viewport(3440, 1440);
    const size = Layout.cellsFor(Layout.desk(wide), 34);

    expect(size.rows / size.cols).toBeGreaterThan(0.4);
  });

  test("the board is centred in the viewport", () => {
    onLayout(10, 10, (board) => {
      const layout = Layout.fit(board, Layout.desk(VIEWPORT));
      const drawnWidth = board.cols * layout.blockWidth;
      const drawnHeight = board.rows * layout.blockWidth;

      expect(layout.origin.x + drawnWidth / 2).toBe(VIEWPORT.width / 2);
      expect(layout.origin.y + drawnHeight / 2).toBe(VIEWPORT.height / 2);
    });
  });

  test("adjacent cells are exactly one block apart", () => {
    onLayout(10, 10, (board) => {
      const layout = Layout.fit(board, Layout.desk(VIEWPORT));
      const [first] = board.playable;
      const right = board.playable.find((c) => c.col === first.col + 1 && c.row === first.row);
      const below = board.playable.find((c) => c.col === first.col && c.row === first.row + 1);

      if (right === undefined || below === undefined)
        Assert.unreachable("fixture needs neighbours");

      expect(Layout.toPixels(layout, right).x - Layout.toPixels(layout, first).x).toBeCloseTo(
        layout.blockWidth,
        9,
      );
      expect(Layout.toPixels(layout, below).y - Layout.toPixels(layout, first).y).toBeCloseTo(
        layout.blockWidth,
        9,
      );
    });
  });

  test("centreOf sits half a block inside the corner", () => {
    onLayout(10, 10, (board) => {
      const layout = Layout.fit(board, Layout.desk(VIEWPORT));
      const corner = Layout.toPixels(layout, board.start);
      const centre = Layout.centreOf(layout, board.start);

      expect(centre.x - corner.x).toBeCloseTo(layout.blockWidth / 2, 9);
      expect(centre.y - corner.y).toBeCloseTo(layout.blockWidth / 2, 9);
    });
  });

  test("every playable cell lands inside the viewport", () => {
    onLayout(10, 10, (board) => {
      const layout = Layout.fit(board, Layout.desk(VIEWPORT));

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
      const tinted: number = Palette.floorTint(n as World.Variant);

      expect(tinted).toBeGreaterThanOrEqual(-10);
      expect(tinted).toBeLessThanOrEqual(10);
    }
  });

  test("different variants can produce different tints", () => {
    const tints = new Set(
      Array.from({ length: 20 }, (_, n) => Palette.floorTint(n as World.Variant)),
    );

    expect(tints.size).toBeGreaterThan(1);
  });
});
