import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Board from "./board";
import type * as Geometry from "./geometry";

const on = <R>(
  cols: number,
  rows: number,
  run: <B>(board: Board.Grid<B>, api: Board.Api<B>) => R,
): R => {
  const result = Board.withBoard({ cols, rows }, run);

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

describe("withBoard", () => {
  test("fractional sizes are floored", () => {
    const size = on(10.9, 10.9, (board) => `${board.cols}x${board.rows}`);

    expect(size).toBe("10x10");
  });

  test("the start cell is playable and is not a wall", () => {
    on(8, 8, (board) => {
      expect(board.playable.some((cell) => Board.equals(cell, board.start))).toBe(true);
      expect(board.walls.some((cell) => Board.equals(cell, board.start))).toBe(false);
    });
  });

  test("playable and wall cells never overlap", () => {
    on(9, 7, (board) => {
      const walls = new Set(board.walls.map((c) => `${c.col},${c.row}`));

      for (const cell of board.playable) {
        expect(walls.has(`${cell.col},${cell.row}`)).toBe(false);
      }
    });
  });

  test("every edge cell is a wall", () => {
    on(6, 5, (board) => {
      const walls = new Set(board.walls.map((c) => `${c.col},${c.row}`));

      for (let c = 0; c < board.cols; c++) {
        expect(walls.has(`${c},0`)).toBe(true);
        expect(walls.has(`${c},${board.rows - 1}`)).toBe(true);
      }
      for (let r = 0; r < board.rows; r++) {
        expect(walls.has(`0,${r}`)).toBe(true);
        expect(walls.has(`${board.cols - 1},${r}`)).toBe(true);
      }
    });
  });
});

const walkUntilWall = <B>(
  api: Board.Api<B>,
  from: Board.Cell<B>,
  direction: Geometry.Direction,
): string => {
  let current = from;

  for (let i = 0; i < 20; i++) {
    const next = api.move(current, direction);
    if (next.kind === "hitWall") return "hitWall";
    current = next.cell;
  }

  return "never hit a wall";
};

describe("move", () => {
  test("stepping off any edge reports hitWall", () => {
    on(5, 5, (board, api) => {
      for (const direction of ["up", "down", "left", "right"] as const) {
        expect(walkUntilWall(api, board.start, direction)).toBe("hitWall");
      }
    });
  });

  test("a move inside the board lands on the adjacent cell", () => {
    on(8, 8, (board, api) => {
      const right = api.move(board.start, "right");

      expect(right.kind).toBe("inside");
      if (right.kind === "inside") {
        const col: number = right.cell.col;
        const row: number = right.cell.row;

        expect(col).toBe(board.start.col + 1);
        expect(row).toBe(board.start.row);
      }
    });
  });

  test("moving is reversible while inside the board", () => {
    on(8, 8, (board, api) => {
      const right = api.move(board.start, "right");
      if (right.kind !== "inside") Assert.unreachable("expected an inside move");

      const back = api.move(right.cell, "left");

      expect(back.kind).toBe("inside");
      if (back.kind === "inside") expect(Board.equals(back.cell, board.start)).toBe(true);
    });
  });
});
