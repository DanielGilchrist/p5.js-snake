import { describe, expect, test } from "bun:test";

import * as Assert from "../core/assert";
import * as Board from "../core/board";
import type * as Geometry from "../core/geometry";
import * as Snake from "../core/snake";
import * as Layout from "./layout";
import * as Spine from "./spine";
import * as Units from "./units";

const onBoard = <R>(run: <B>(api: Board.Api<B>, board: Board.Grid<B>) => R): R => {
  const result = Board.parse(Board.size(16, 16), <B>(board: Board.Grid<B>, api: Board.Api<B>) =>
    run(api, board),
  );

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

const step = <B>(api: Board.Api<B>, snake: Snake.State<B>): Snake.State<B> => {
  const moved = Snake.tryMove(api, snake);

  if (moved.kind === "hitWall") Assert.unreachable("fixture must stay inside the board");

  return Snake.moveTo(snake, moved.to, moved.dropped);
};

const bodyOf = <B>(api: Board.Api<B>, board: Board.Grid<B>): Snake.State<B> => {
  let snake = Snake.spawn(board.start, "right");

  for (let i = 0; i < 4; i++) snake = Snake.grow(snake);
  for (let i = 0; i < 4; i++) snake = step(api, snake);

  return snake;
};

const lengthOf = (spine: readonly Spine.Joint[]): number => {
  let total = 0;

  for (let i = 1; i < spine.length; i++) {
    const from = spine[i - 1];
    const to = spine[i];

    if (from === undefined || to === undefined) continue;

    total += Math.hypot(to.at.x - from.at.x, to.at.y - from.at.y);
  }

  return total;
};

const gapsOf = (spine: readonly Spine.Joint[]): readonly number[] => {
  const gaps: number[] = [];

  for (let i = 1; i < spine.length; i++) {
    const from = spine[i - 1];
    const to = spine[i];

    if (from === undefined || to === undefined) continue;

    gaps.push(Math.hypot(to.at.x - from.at.x, to.at.y - from.at.y));
  }

  return gaps;
};

const BLENDS = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1];

const turning = <B>(
  api: Board.Api<B>,
  board: Board.Grid<B>,
  direction: Geometry.Direction,
): { readonly before: Snake.State<B>; readonly after: Snake.State<B> } => {
  const before = bodyOf(api, board);
  const after = step(api, Snake.turnTo(before, direction));

  return { before, after };
};

describe("spine", () => {
  test("the body keeps a constant length while turning", () => {
    onBoard((api, board) => {
      const { before, after } = turning(api, board, "down");
      const layout = Layout.fit(board, Layout.desk(Units.viewport(600, 600)));
      const expected = (Snake.length(after) - 1) * layout.blockWidth;

      for (const blend of BLENDS) {
        const spine = Spine.of(after, before, blend, layout);

        expect(lengthOf(spine)).toBeCloseTo(expected, 6);
      }
    });
  });

  test("no joint gap ever collapses mid-turn", () => {
    onBoard((api, board) => {
      const { before, after } = turning(api, board, "down");
      const layout = Layout.fit(board, Layout.desk(Units.viewport(600, 600)));

      for (const blend of BLENDS) {
        for (const gap of gapsOf(Spine.of(after, before, blend, layout))) {
          expect(gap).toBeLessThanOrEqual(layout.blockWidth + 1e-6);
        }
      }
    });
  });

  test("travelling straight keeps a constant length too", () => {
    onBoard((api, board) => {
      const before = bodyOf(api, board);
      const after = step(api, before);
      const layout = Layout.fit(board, Layout.desk(Units.viewport(600, 600)));
      const expected = (Snake.length(after) - 1) * layout.blockWidth;

      for (const blend of BLENDS) {
        expect(lengthOf(Spine.of(after, before, blend, layout))).toBeCloseTo(expected, 6);
      }
    });
  });

  test("the ends land exactly on the old and new snake", () => {
    onBoard((api, board) => {
      const { before, after } = turning(api, board, "down");
      const layout = Layout.fit(board, Layout.desk(Units.viewport(600, 600)));

      const settled = Spine.of(after, before, 1, layout)[0];
      const started = Spine.of(after, before, 0, layout)[0];

      expect(settled?.at).toEqual(Layout.centreOf(layout, after.head));
      expect(started?.at).toEqual(Layout.centreOf(layout, before.head));
    });
  });

  test("a snake that has not moved never slides, however the clock runs", () => {
    onBoard((api, board) => {
      const snake = bodyOf(api, board);
      const layout = Layout.fit(board, Layout.desk(Units.viewport(600, 600)));
      const cells = Snake.segments(snake);
      const settled = cells.map((cell) => Layout.centreOf(layout, cell));

      for (const blend of BLENDS) {
        const spine = Spine.of(snake, snake, blend, layout);

        expect(spine.map((it) => it.at)).toEqual(settled);
      }
    });
  });

  test("growing pins the tail while the head advances", () => {
    onBoard((api, board) => {
      const before = bodyOf(api, board);
      const after = step(api, Snake.grow(before));
      const layout = Layout.fit(board, Layout.desk(Units.viewport(600, 600)));

      expect(Snake.length(after)).toBe(Snake.length(before) + 1);

      const tailAt = (blend: number): Units.Point | undefined => {
        const spine = Spine.of(after, before, blend, layout);

        return spine[spine.length - 1]?.at;
      };

      expect(tailAt(0)).toEqual(tailAt(1));
    });
  });
});
