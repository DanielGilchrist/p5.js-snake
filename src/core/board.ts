import { type Direction } from "./geometry";
import type { NonEmpty } from "./non-empty";
import { err, ok, type Result } from "./result";

declare const region: unique symbol;

type Region<B> = { readonly [region]: (b: B) => B };

export type Col<B> = number & Region<B>;
export type Row<B> = number & Region<B>;

export type Cell<B> = { readonly col: Col<B>; readonly row: Row<B> };

export type Board<B> = {
  readonly cols: number;
  readonly rows: number;
  readonly playable: NonEmpty<Cell<B>>;
  readonly walls: readonly Cell<B>[];
  readonly start: Cell<B>;
};

export type Move<B> =
  | { readonly kind: "inside"; readonly cell: Cell<B> }
  | { readonly kind: "hitWall" };

export type BoardApi<B> = {
  readonly move: (from: Cell<B>, direction: Direction) => Move<B>;
};

export type GridSize = { readonly cols: number; readonly rows: number };

export type BoardError = { readonly kind: "too-small"; readonly given: GridSize };

export const equals = <B>(a: Cell<B>, b: Cell<B>): boolean => a.col === b.col && a.row === b.row;

export const key = <B>(target: Cell<B>): string => `${target.col},${target.row}`;

const DELTA = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
} as const satisfies Record<Direction, readonly [number, number]>;

const MIN_SIDE = 3;

export const withBoard = <R>(
  size: GridSize,
  run: <B>(board: Board<B>, api: BoardApi<B>) => R,
): Result<R, BoardError> => {
  const cols = Math.floor(size.cols);
  const rows = Math.floor(size.rows);

  if (cols < MIN_SIDE || rows < MIN_SIDE) {
    return err({ kind: "too-small", given: { cols, rows } });
  }

  type B = never;

  const toCol = (n: number): Col<B> => n as Col<B>;
  const toRow = (n: number): Row<B> => n as Row<B>;
  const cell = (c: number, r: number): Cell<B> => ({ col: toCol(c), row: toRow(r) });

  const isWall = (col: number, row: number): boolean =>
    col <= 0 || row <= 0 || col >= cols - 1 || row >= rows - 1;

  const start = cell(1, 1);
  const rest: Cell<B>[] = [];
  const walls: Cell<B>[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (isWall(col, row)) {
        walls.push(cell(col, row));
      } else if (col !== 1 || row !== 1) {
        rest.push(cell(col, row));
      }
    }
  }

  const board: Board<B> = {
    cols,
    rows,
    playable: [start, ...rest],
    walls,
    start,
  };

  const api: BoardApi<B> = {
    move: (from, direction) => {
      const [dc, dr] = DELTA[direction];
      const col = from.col + dc;
      const row = from.row + dr;

      return isWall(col, row) ? { kind: "hitWall" } : { kind: "inside", cell: cell(col, row) };
    },
  };

  return ok(run(board, api));
};
