import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Board from "./board";
import * as Game from "./game";
import type * as Geometry from "./geometry";
import * as NonEmpty from "./non-empty";
import * as Rng from "./rng";
import * as Snake from "./snake";

const onBoard = <R>(
  size: Board.GridSize,
  seed: number,
  run: <B>(api: Board.Api<B>, state: Game.State<B>) => R,
): R => {
  const result = Board.parse(size, <B>(board: Board.Grid<B>, api: Board.Api<B>) =>
    run(api, Game.start(board, Rng.fromSeed(seed))),
  );

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

const play = <B>(
  api: Board.Api<B>,
  from: Game.State<B>,
  commands: readonly Game.Command[],
): Game.State<B> =>
  commands.reduce((current, command) => Game.step(api, current, command).state, from);

const ticks = (n: number): readonly Game.Command[] =>
  Array.from({ length: n }, () => ({ kind: "tick" }));

const chase = <B>(state: Game.State<B>): Game.Command => {
  const { snake, food } = state.world;
  const dc = food.col - snake.head.col;
  const dr = food.row - snake.head.row;
  const direction: Geometry.Direction =
    dc !== 0 ? (dc > 0 ? "right" : "left") : dr > 0 ? "down" : "up";

  return { kind: "turn", direction };
};

const autoplay = <B>(
  api: Board.Api<B>,
  from: Game.State<B>,
  turns: number,
  each?: (s: Game.State<B>) => void,
): Game.State<B> => {
  let current = from;

  for (let i = 0; i < turns; i++) {
    current = Game.step(api, current, chase(current)).state;
    current = Game.step(api, current, { kind: "tick" }).state;
    if (current.kind === "over") break;
    each?.(current);
  }

  return current;
};

const SMALL: Board.GridSize = { cols: 6, rows: 6 };
const MEDIUM: Board.GridSize = { cols: 10, rows: 10 };
const LARGE: Board.GridSize = { cols: 14, rows: 14 };

describe("parse", () => {
  test("rejects boards with no playable interior", () => {
    expect(Board.parse({ cols: 2, rows: 10 }, () => 1).ok).toBe(false);
    expect(Board.parse({ cols: 10, rows: 2 }, () => 1).ok).toBe(false);
  });

  test("a parsed board always has a playable cell", () => {
    const result = Board.parse({ cols: 3, rows: 3 }, (board) => board.playable.length);

    expect(result.ok && result.value).toBeGreaterThan(0);
  });

  test("walls and playable cells together cover the grid", () => {
    const result = Board.parse(MEDIUM, (board) => board.walls.length + board.playable.length);

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

  test("the first turn after a tick applies immediately", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const turned = play(api, state, [{ kind: "turn", direction: "down" }]);

      expect(turned.world.snake.facing).toBe("down");
      expect(turned.world.pending.some).toBe(false);
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
      const before = Snake.length(state.world.snake);
      const fed = autoplay(api, state, 60);

      expect(fed.world.score).toBeGreaterThan(0);
      expect(Snake.length(fed.world.snake)).toBeGreaterThan(before);
    });
  });

  test("food never spawns under the snake", () => {
    onBoard({ cols: 12, rows: 12 }, 5, (api, state) => {
      autoplay(api, state, 200, (current) => {
        expect(
          Snake.segments(current.world.snake).some((s) => Board.equals(s, current.world.food)),
        ).toBe(false);
      });
    });
  });

  test("the snake never overlaps itself while alive", () => {
    onBoard({ cols: 12, rows: 12 }, 9, (api, state) => {
      autoplay(api, state, 200, (current) => {
        const cells = Snake.segments(current.world.snake).map(Board.key);

        expect(new Set(cells).size).toBe(cells.length);
      });
    });
  });

  test("the snake never leaves the board while alive", () => {
    onBoard({ cols: 12, rows: 12 }, 4, (api, state) => {
      autoplay(api, state, 200, (current) => {
        for (const segment of Snake.segments(current.world.snake)) {
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
    const commands: readonly Game.Command[] = [
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
      onBoard({ cols: 20, rows: 20 }, seed, (_api, state) => Board.key(state.world.food));

    expect(foodFor(1)).not.toBe(foodFor(2));
  });
});

describe("input buffering", () => {
  test("a second turn in the same tick waits for the next one", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const queued = play(api, state, [
        { kind: "turn", direction: "down" },
        { kind: "turn", direction: "left" },
      ]);

      expect(queued.world.snake.facing).toBe("down");
      expect(queued.world.pending.some).toBe(true);

      const { state: afterTick } = Game.step(api, queued, { kind: "tick" });

      expect(afterTick.world.snake.facing).toBe("left");
      expect(afterTick.world.pending.some).toBe(false);
    });
  });

  test("only one direction change happens per tick", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const directions: readonly Geometry.Direction[] = ["down", "left", "up", "right", "down"];
      const spammed = play(
        api,
        state,
        directions.map((direction) => ({ kind: "turn", direction })),
      );

      expect(spammed.world.snake.facing).toBe("down");
    });
  });
});

describe("winning", () => {
  test("filling the board ends the game as a win", () => {
    const cycle: readonly Geometry.Direction[] = ["right", "down", "left", "up"];

    for (let seed = 0; seed < 5; seed++) {
      const ending = onBoard({ cols: 4, rows: 4 }, seed, (api, state) => {
        let current = state;

        for (let i = 0; i < 60; i++) {
          const direction = cycle[i % cycle.length];
          if (direction === undefined) break;

          current = Game.step(api, current, { kind: "turn", direction }).state;
          current = Game.step(api, current, { kind: "tick" }).state;
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
      expect(Snake.length(restarted.world.snake)).toBe(1);
      expect(restarted.world.pending.some).toBe(false);
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
      expect(after.world.snake.tail.some((s) => Board.equals(s, after.world.snake.head))).toBe(
        false,
      );
    });
  });

  test("turns are ignored while paused", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const paused = play(api, state, [{ kind: "togglePause" }]);
      const attempted = play(api, paused, [{ kind: "turn", direction: "down" }]);

      expect(attempted.kind).toBe("paused");
      expect(attempted.world.pending.some).toBe(false);
    });
  });

  test("eating grows the snake by exactly one segment", () => {
    onBoard(LARGE, 11, (api, state) => {
      let current = state;
      let previousScore = 0;
      let previousLength = Snake.length(current.world.snake);

      for (let i = 0; i < 200; i++) {
        current = Game.step(api, current, chase(current)).state;
        current = Game.step(api, current, { kind: "tick" }).state;
        if (current.kind === "over") break;

        const grew = Snake.length(current.world.snake) - previousLength;
        const scored = current.world.score - previousScore;

        expect(grew).toBeLessThanOrEqual(1);
        expect(scored).toBeLessThanOrEqual(1);

        previousLength = Snake.length(current.world.snake);
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
          const cells = Snake.segments(snake).map(Board.key);

          expect(Snake.length(snake)).toBeLessThanOrEqual(1 + score);
          if (snake.growth === 0) expect(Snake.length(snake)).toBe(1 + score);

          expect(new Set(cells).size).toBe(cells.length);
          expect(
            Snake.segments(current.world.snake).some((s) => Board.equals(s, current.world.food)),
          ).toBe(false);

          for (const segment of Snake.segments(current.world.snake)) {
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
  test("a perpendicular turn pair cannot fold the snake back into its neck", () => {
    for (let seed = 0; seed < 12; seed++) {
      onBoard({ cols: 15, rows: 13 }, seed, (api, state) => {
        const grown = play(api, autoplay(api, state, 120, undefined), ticks(2));
        if (grown.kind !== "playing") return;
        if (Snake.length(grown.world.snake) < 3) return;

        const { head, tail } = grown.world.snake;
        const [neck] = tail;
        if (neck === undefined) return;

        const dc = head.col - neck.col;
        const dr = head.row - neck.row;

        const back: Geometry.Direction =
          dc > 0 ? "left" : dc < 0 ? "right" : dr > 0 ? "up" : "down";
        const side: Geometry.Direction = dc === 0 ? "left" : "up";

        const folded = play(api, grown, [
          { kind: "turn", direction: side },
          { kind: "turn", direction: back },
          { kind: "tick" },
        ]);

        const cells = Snake.segments(folded.world.snake).map(Board.key);
        expect(new Set(cells).size).toBe(cells.length);
        expect(folded.kind).toBe("playing");
      });
    }
  });

  test("bursts of turns between ticks never fold the snake into itself", () => {
    const turns: readonly Geometry.Direction[] = ["up", "down", "left", "right"];

    for (let seed = 0; seed < 20; seed++) {
      onBoard({ cols: 13, rows: 11 }, seed, (api, state) => {
        let current = autoplay(api, state, 120, undefined);
        if (current.kind === "over") return;

        expect(Snake.length(current.world.snake)).toBeGreaterThan(2);

        let picker = Rng.fromSeed(seed * 977 + 5);

        for (let i = 0; i < 220; i++) {
          const bursts = (i % 3) + 1;

          for (let n = 0; n < bursts; n++) {
            const [direction, next] = Rng.choose(
              picker,
              turns as NonEmpty.List<Geometry.Direction>,
            );
            picker = next;
            current = Game.step(api, current, { kind: "turn", direction }).state;
          }

          current = Game.step(api, current, { kind: "tick" }).state;
          if (current.kind === "over") break;

          const cells = Snake.segments(current.world.snake).map(Board.key);
          expect(new Set(cells).size).toBe(cells.length);
        }
      });
    }
  });

  test("pausing and resuming does not change how a game plays out", () => {
    const script: readonly Game.Command[] = [
      { kind: "turn", direction: "down" },
      ...ticks(4),
      { kind: "turn", direction: "right" },
      ...ticks(4),
      { kind: "turn", direction: "up" },
      ...ticks(3),
    ];

    const interrupted: readonly Game.Command[] = [
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
    const commands: readonly Game.Command[] = [
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
        let picker = Rng.fromSeed(seed * 31 + 1);

        for (let i = 0; i < 250; i++) {
          const [choice, next] = Rng.choose(picker, commands as NonEmpty.List<Game.Command>);
          picker = next;
          current = Game.step(api, current, choice).state;

          const { snake, score, board } = current.world;
          const cells = Snake.segments(snake).map(Board.key);

          expect(new Set(cells).size).toBe(cells.length);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(Snake.length(snake)).toBeLessThanOrEqual(board.playable.length);

          for (const segment of Snake.segments(snake)) {
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
        expect(Snake.length(restarted.world.snake)).toBe(1);
      }
    });
  });
});
