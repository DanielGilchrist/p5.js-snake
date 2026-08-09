import type * as Geometry from "./geometry";
import type * as NonEmpty from "./non-empty";
import * as Result from "./result";

declare const region: unique symbol;

type Region<B> = { readonly [region]: (b: B) => B };

export type Col<B> = number & Region<B>;
export type Row<B> = number & Region<B>;

export type Cell<B> = { readonly col: Col<B>; readonly row: Row<B> };

export type Grid<B> = {
  readonly cols: number;
  readonly rows: number;
  readonly playable: NonEmpty.List<Cell<B>>;
  readonly walls: readonly Cell<B>[];
  readonly start: Cell<B>;
};

export type Move<B> =
  | { readonly kind: "inside"; readonly cell: Cell<B> }
  | { readonly kind: "hitWall" };

export type Api<B> = {
  readonly move: (from: Cell<B>, direction: Geometry.Direction) => Move<B>;
};

export type GridSize = { readonly cols: number; readonly rows: number };

export const size = (cols: number, rows: number): GridSize => ({ cols, rows });

export type Error = { readonly kind: "too-small"; readonly given: GridSize };

const tooSmall = (given: GridSize): Error => ({ kind: "too-small", given });

const grid = <B>(fields: Grid<B>): Grid<B> => ({ ...fields });

const inside = <B>(cell: Cell<B>): Move<B> => ({ kind: "inside", cell });

const hitWall = { kind: "hitWall" } as const;

export const equals = <B>(a: Cell<B>, b: Cell<B>): boolean => a.col === b.col && a.row === b.row;

export const key = <B>(target: Cell<B>): string => `${target.col},${target.row}`;

const DELTA = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
} as const satisfies Record<Geometry.Direction, readonly [number, number]>;

const MIN_SIDE = 3;

export const parse = <R>(
  requested: GridSize,
  run: <B>(board: Grid<B>, api: Api<B>) => R,
): Result.Type<R, Error> => {
  const cols = Math.floor(requested.cols);
  const rows = Math.floor(requested.rows);

  if (cols < MIN_SIDE || rows < MIN_SIDE) {
    return Result.err(tooSmall(size(cols, rows)));
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

  const board = grid<B>({ cols, rows, playable: [start, ...rest], walls, start });

  const api: Api<B> = {
    move: (from, direction) => {
      const [dc, dr] = DELTA[direction];
      const col = from.col + dc;
      const row = from.row + dr;

      return isWall(col, row) ? hitWall : inside(cell(col, row));
    },
  };

  return Result.ok(run(board, api));
};
