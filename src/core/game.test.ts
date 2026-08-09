import { describe, expect, test } from "bun:test";

import { equals, key, withBoard, type Board, type BoardApi, type GridSize } from "./board";
import { newGame, step, type Command, type GameState } from "./game";
import type { Direction } from "./geometry";
import { rng } from "./rng";
import { length, segments } from "./snake";

const onBoard = <R>(
  size: GridSize,
  seed: number,
  run: <B>(api: BoardApi<B>, state: GameState<B>) => R,
): R => {
  const result = withBoard(size, <B>(board: Board<B>, api: BoardApi<B>) =>
    run(api, newGame(board, rng(seed))),
  );

  if (!result.ok) throw new Error("fixture board must parse");

  return result.value;
};

const play = <B>(
  api: BoardApi<B>,
  from: GameState<B>,
  commands: readonly Command[],
): GameState<B> => commands.reduce((current, command) => step(api, current, command).state, from);

const ticks = (n: number): readonly Command[] =>
  Array.from({ length: n }, () => ({ kind: "tick" }));

const chase = <B>(state: GameState<B>): Command => {
  const { snake, food } = state.world;
  const dc = food.col - snake.head.col;
  const dr = food.row - snake.head.row;
  const direction: Direction = dc !== 0 ? (dc > 0 ? "right" : "left") : dr > 0 ? "down" : "up";

  return { kind: "turn", direction };
};

const autoplay = <B>(
  api: BoardApi<B>,
  from: GameState<B>,
  turns: number,
  each?: (s: GameState<B>) => void,
): GameState<B> => {
  let current = from;

  for (let i = 0; i < turns; i++) {
    current = step(api, current, chase(current)).state;
    current = step(api, current, { kind: "tick" }).state;
    if (current.kind === "over") break;
    each?.(current);
  }

  return current;
};

const SMALL: GridSize = { cols: 6, rows: 6 };
const MEDIUM: GridSize = { cols: 10, rows: 10 };
const LARGE: GridSize = { cols: 14, rows: 14 };

describe("withBoard", () => {
  test("rejects boards with no playable interior", () => {
    expect(withBoard({ cols: 2, rows: 10 }, () => 1).ok).toBe(false);
    expect(withBoard({ cols: 10, rows: 2 }, () => 1).ok).toBe(false);
  });

  test("a parsed board always has a playable cell", () => {
    const result = withBoard({ cols: 3, rows: 3 }, (board) => board.playable.length);

    expect(result.ok && result.value).toBeGreaterThan(0);
  });

  test("walls and playable cells together cover the grid", () => {
    const result = withBoard(MEDIUM, (board) => board.walls.length + board.playable.length);

    expect(result.ok && result.value).toBe(100);
  });
});

describe("step", () => {
  test("turning into your own neck is ignored", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const reversed = play(api, state, [{ kind: "turn", direction: "left" }, { kind: "tick" }]);

      expect(reversed.world.snake.facing).toBe("right");
    });
  });

  test("running into a wall ends the game", () => {
    onBoard(SMALL, 1, (api, state) => {
      expect(play(api, state, ticks(20)).kind).toBe("over");
    });
  });

  test("pause freezes the world", () => {
    onBoard(MEDIUM, 3, (api, state) => {
      const running = play(api, state, ticks(2));
      const paused = play(api, running, [{ kind: "togglePause" }, ...ticks(10)]);

      expect(paused.kind).toBe("paused");
      expect(paused.world.snake.head).toEqual(running.world.snake.head);
    });
  });

  test("pause is a no-op once the game is over", () => {
    onBoard(SMALL, 1, (api, state) => {
      const over = play(api, state, ticks(20));

      expect(play(api, over, [{ kind: "togglePause" }]).kind).toBe("over");
    });
  });

  test("eating grows the snake and scores a point", () => {
    onBoard(LARGE, 11, (api, state) => {
      const before = length(state.world.snake);
      const fed = autoplay(api, state, 60);

      expect(fed.world.score).toBeGreaterThan(0);
      expect(length(fed.world.snake)).toBeGreaterThan(before);
    });
  });

  test("food never spawns under the snake", () => {
    onBoard({ cols: 12, rows: 12 }, 5, (api, state) => {
      autoplay(api, state, 200, (current) => {
        expect(segments(current.world.snake).some((s) => equals(s, current.world.food))).toBe(
          false,
        );
      });
    });
  });

  test("the snake never overlaps itself while alive", () => {
    onBoard({ cols: 12, rows: 12 }, 9, (api, state) => {
      autoplay(api, state, 200, (current) => {
        const cells = segments(current.world.snake).map(key);

        expect(new Set(cells).size).toBe(cells.length);
      });
    });
  });

  test("the snake never leaves the board while alive", () => {
    onBoard({ cols: 12, rows: 12 }, 4, (api, state) => {
      autoplay(api, state, 200, (current) => {
        for (const segment of segments(current.world.snake)) {
          expect(segment.col).toBeGreaterThan(0);
          expect(segment.row).toBeGreaterThan(0);
          expect(segment.col).toBeLessThan(current.world.board.cols - 1);
          expect(segment.row).toBeLessThan(current.world.board.rows - 1);
        }
      });
    });
  });
});

describe("determinism", () => {
  test("same seed and same commands produce the same state", () => {
    const commands: readonly Command[] = [
      { kind: "turn", direction: "down" },
      ...ticks(5),
      { kind: "turn", direction: "right" },
      ...ticks(5),
    ];

    const run = (): string =>
      onBoard(MEDIUM, 42, (api, state) => JSON.stringify(play(api, state, commands)));

    expect(run()).toEqual(run());
  });

  test("different seeds place food differently", () => {
    const foodFor = (seed: number): string =>
      onBoard({ cols: 20, rows: 20 }, seed, (_api, state) => key(state.world.food));

    expect(foodFor(1)).not.toBe(foodFor(2));
  });
});

describe("input buffering", () => {
  test("queued turns apply one per tick", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const queued = play(api, state, [
        { kind: "turn", direction: "down" },
        { kind: "turn", direction: "left" },
      ]);

      expect(queued.world.buffered.length).toBe(2);

      const { state: afterFirst } = step(api, queued, { kind: "tick" });

      expect(afterFirst.world.snake.facing).toBe("down");
      expect(afterFirst.world.buffered.length).toBe(1);
    });
  });

  test("the buffer is bounded", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const directions: readonly Direction[] = ["down", "left", "up", "right", "down"];
      const queued = play(
        api,
        state,
        directions.map((direction) => ({ kind: "turn", direction })),
      );

      expect(queued.world.buffered.length).toBeLessThanOrEqual(2);
    });
  });
});
