import { describe, expect, test } from "bun:test";

import { equals, key, withBoard, type Board, type BoardApi, type GridSize } from "./board";
import { newGame, step, type Command, type GameState } from "./game";
import type { Direction } from "./geometry";
import type { NonEmpty } from "./non-empty";
import { choose, rng } from "./rng";
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

describe("winning", () => {
  test("filling the board ends the game as a win", () => {
    const cycle: readonly Direction[] = ["right", "down", "left", "up"];

    for (let seed = 0; seed < 5; seed++) {
      const ending = onBoard({ cols: 4, rows: 4 }, seed, (api, state) => {
        let current = state;

        for (let i = 0; i < 60; i++) {
          const direction = cycle[i % cycle.length];
          if (direction === undefined) break;

          current = step(api, current, { kind: "turn", direction }).state;
          current = step(api, current, { kind: "tick" }).state;
          if (current.kind === "over") return current.ending;
        }

        return "still playing";
      });

      expect(ending).toBe("filled");
    }
  });
});

describe("restart", () => {
  test("resets the score and the snake but keeps the board", () => {
    onBoard(LARGE, 11, (api, state) => {
      const played = autoplay(api, state, 60);
      expect(played.world.score).toBeGreaterThan(0);

      const restarted = play(api, played, [{ kind: "restart" }]);

      expect(restarted.kind).toBe("playing");
      expect(restarted.world.score).toBe(0);
      expect(length(restarted.world.snake)).toBe(1);
      expect(restarted.world.buffered).toEqual([]);
      expect(restarted.world.board).toBe(played.world.board);
    });
  });
});

describe("turning", () => {
  test("two quick opposite turns cannot reverse the snake into itself", () => {
    onBoard(MEDIUM, 2, (api, state) => {
      const grown = play(api, state, ticks(1));
      const queued = play(api, grown, [
        { kind: "turn", direction: "down" },
        { kind: "turn", direction: "up" },
      ]);

      const after = play(api, queued, ticks(2));

      expect(after.kind).toBe("playing");
      expect(after.world.snake.tail.some((s) => equals(s, after.world.snake.head))).toBe(false);
    });
  });

  test("turns are ignored while paused", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const paused = play(api, state, [{ kind: "togglePause" }]);
      const attempted = play(api, paused, [{ kind: "turn", direction: "down" }]);

      expect(attempted.kind).toBe("paused");
      expect(attempted.world.buffered).toEqual([]);
    });
  });

  test("eating grows the snake by exactly one segment", () => {
    onBoard(LARGE, 11, (api, state) => {
      let current = state;
      let previousScore = 0;
      let previousLength = length(current.world.snake);

      for (let i = 0; i < 200; i++) {
        current = step(api, current, chase(current)).state;
        current = step(api, current, { kind: "tick" }).state;
        if (current.kind === "over") break;

        const grew = length(current.world.snake) - previousLength;
        const scored = current.world.score - previousScore;

        expect(grew).toBeLessThanOrEqual(1);
        expect(scored).toBeLessThanOrEqual(1);

        previousLength = length(current.world.snake);
        previousScore = current.world.score;
      }

      expect(current.world.score).toBeGreaterThan(0);
    });
  });
});

describe("invariants across many seeds", () => {
  test("the snake stays valid for 25 different games", () => {
    for (let seed = 0; seed < 25; seed++) {
      onBoard({ cols: 11, rows: 9 }, seed, (api, state) => {
        autoplay(api, state, 150, (current) => {
          const { snake, score } = current.world;
          const cells = segments(snake).map(key);

          expect(length(snake)).toBeLessThanOrEqual(1 + score);
          if (snake.growth === 0) expect(length(snake)).toBe(1 + score);

          expect(new Set(cells).size).toBe(cells.length);
          expect(segments(current.world.snake).some((s) => equals(s, current.world.food))).toBe(
            false,
          );

          for (const segment of segments(current.world.snake)) {
            expect(segment.col).toBeGreaterThan(0);
            expect(segment.row).toBeGreaterThan(0);
            expect(segment.col).toBeLessThan(current.world.board.cols - 1);
            expect(segment.row).toBeLessThan(current.world.board.rows - 1);
          }
        });
      });
    }
  });
});

describe("end to end", () => {
  test("pausing and resuming does not change how a game plays out", () => {
    const script: readonly Command[] = [
      { kind: "turn", direction: "down" },
      ...ticks(4),
      { kind: "turn", direction: "right" },
      ...ticks(4),
      { kind: "turn", direction: "up" },
      ...ticks(3),
    ];

    const interrupted: readonly Command[] = [
      ...script.slice(0, 5),
      { kind: "togglePause" },
      ...ticks(6),
      { kind: "togglePause" },
      ...script.slice(5),
    ];

    onBoard(LARGE, 17, (api, state) => {
      const straight = play(api, state, script);
      const withBreak = play(api, state, interrupted);

      expect(withBreak.world.snake).toEqual(straight.world.snake);
      expect(withBreak.world.score).toBe(straight.world.score);
      expect(withBreak.world.food).toEqual(straight.world.food);
    });
  });

  test("a scored point is never lost while the game continues", () => {
    onBoard(LARGE, 23, (api, state) => {
      let highest = 0;

      autoplay(api, state, 200, (current) => {
        expect(current.world.score).toBeGreaterThanOrEqual(highest);
        highest = current.world.score;
      });
    });
  });

  test("random command sequences never corrupt the world", () => {
    const commands: readonly Command[] = [
      { kind: "tick" },
      { kind: "togglePause" },
      { kind: "restart" },
      { kind: "turn", direction: "up" },
      { kind: "turn", direction: "down" },
      { kind: "turn", direction: "left" },
      { kind: "turn", direction: "right" },
    ];

    for (let seed = 0; seed < 15; seed++) {
      onBoard({ cols: 9, rows: 9 }, seed, (api, state) => {
        let current = state;
        let picker = rng(seed * 31 + 1);

        for (let i = 0; i < 250; i++) {
          const [choice, next] = choose(picker, commands as NonEmpty<Command>);
          picker = next;
          current = step(api, current, choice).state;

          const { snake, score, board } = current.world;
          const cells = segments(snake).map(key);

          expect(new Set(cells).size).toBe(cells.length);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(length(snake)).toBeLessThanOrEqual(board.playable.length);

          for (const segment of segments(snake)) {
            expect(segment.col).toBeGreaterThan(0);
            expect(segment.row).toBeGreaterThan(0);
            expect(segment.col).toBeLessThan(board.cols - 1);
            expect(segment.row).toBeLessThan(board.rows - 1);
          }
        }
      });
    }
  });

  test("a game can always be restarted back into a playable state", () => {
    onBoard(MEDIUM, 8, (api, state) => {
      for (const before of [state, play(api, state, ticks(3)), play(api, state, ticks(40))]) {
        const restarted = play(api, before, [{ kind: "restart" }]);

        expect(restarted.kind).toBe("playing");
        expect(restarted.world.score).toBe(0);
        expect(length(restarted.world.snake)).toBe(1);
      }
    });
  });
});
