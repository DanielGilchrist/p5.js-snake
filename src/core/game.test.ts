import { describe, expect, test } from "bun:test";

import * as Players from "./players";
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
    run(api, Game.start(board, Rng.fromSeed(seed), Game.SOLO)),
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
  const { food } = state.world;
  const { snake } = NonEmpty.head(state.world.players);
  const dc = food.col - snake.head.col;
  const dr = food.row - snake.head.row;
  const direction: Geometry.Direction =
    dc !== 0 ? (dc > 0 ? "right" : "left") : dr > 0 ? "down" : "up";

  return { kind: "turn", player: Players.FIRST, direction };
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
      const reversed = play(api, state, [
        { kind: "turn", player: Players.FIRST, direction: "left" },
        { kind: "tick" },
      ]);

      expect(NonEmpty.head(reversed.world.players).snake.facing).toBe("right");
    });
  });

  test("running into a wall ends the game", () => {
    onBoard(SMALL, 1, (api, state) => {
      expect(play(api, state, ticks(20)).kind).toBe("over");
    });
  });

  test("a turn is buffered on press and taken by the next tick", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const turned = play(api, state, [{ kind: "turn", player: Players.FIRST, direction: "down" }]);

      expect(NonEmpty.head(turned.world.players).turns).toEqual(["down"]);
      expect(NonEmpty.head(turned.world.players).snake.facing).toBe("right");

      const ticked = play(api, turned, ticks(1));

      expect(NonEmpty.head(ticked.world.players).snake.facing).toBe("down");
      expect(NonEmpty.head(ticked.world.players).turns).toEqual([]);
      expect(
        NonEmpty.head(ticked.world.players).snake.head.row -
          NonEmpty.head(state.world.players).snake.head.row,
      ).toBe(1);
    });
  });

  test("pause freezes the world", () => {
    onBoard(MEDIUM, 3, (api, state) => {
      const running = play(api, state, ticks(2));
      const paused = play(api, running, [{ kind: "togglePause" }, ...ticks(10)]);

      expect(paused.kind).toBe("paused");
      expect(NonEmpty.head(paused.world.players).snake.head).toEqual(
        NonEmpty.head(running.world.players).snake.head,
      );
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
      const before = Snake.length(NonEmpty.head(state.world.players).snake);
      const fed = autoplay(api, state, 60);

      expect(NonEmpty.head(fed.world.players).score).toBeGreaterThan(0);
      expect(Snake.length(NonEmpty.head(fed.world.players).snake)).toBeGreaterThan(before);
    });
  });

  test("food never spawns under the snake", () => {
    onBoard({ cols: 12, rows: 12 }, 5, (api, state) => {
      autoplay(api, state, 200, (current) => {
        expect(
          Snake.segments(NonEmpty.head(current.world.players).snake).some((s) =>
            Board.equals(s, current.world.food),
          ),
        ).toBe(false);
      });
    });
  });

  test("the snake never overlaps itself while alive", () => {
    onBoard({ cols: 12, rows: 12 }, 9, (api, state) => {
      autoplay(api, state, 200, (current) => {
        const cells = Snake.segments(NonEmpty.head(current.world.players).snake).map(Board.key);

        expect(new Set(cells).size).toBe(cells.length);
      });
    });
  });

  test("the snake never leaves the board while alive", () => {
    onBoard({ cols: 12, rows: 12 }, 4, (api, state) => {
      autoplay(api, state, 200, (current) => {
        for (const segment of Snake.segments(NonEmpty.head(current.world.players).snake)) {
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
      { kind: "turn", player: Players.FIRST, direction: "down" },
      ...ticks(5),
      { kind: "turn", player: Players.FIRST, direction: "right" },
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
        { kind: "turn", player: Players.FIRST, direction: "down" },
        { kind: "turn", player: Players.FIRST, direction: "left" },
      ]);

      expect(NonEmpty.head(queued.world.players).turns).toEqual(["down", "left"]);

      const first = play(api, queued, ticks(1));

      expect(NonEmpty.head(first.world.players).snake.facing).toBe("down");
      expect(NonEmpty.head(first.world.players).turns).toEqual(["left"]);

      const second = play(api, first, ticks(1));

      expect(NonEmpty.head(second.world.players).snake.facing).toBe("left");
      expect(NonEmpty.head(second.world.players).turns).toEqual([]);
    });
  });

  test("only one direction change happens per tick", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const directions: readonly Geometry.Direction[] = ["down", "left", "up", "right", "down"];
      const spammed = play(
        api,
        state,
        directions.map((direction) => ({ kind: "turn", player: Players.FIRST, direction })),
      );

      expect(NonEmpty.head(spammed.world.players).snake.facing).toBe("right");

      const ticked = play(api, spammed, ticks(1));

      expect(NonEmpty.head(ticked.world.players).snake.facing).toBe("down");
    });
  });

  test("spam past the buffer is dropped, it does not overwrite what you asked for first", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const directions: readonly Geometry.Direction[] = ["down", "left", "up", "right", "down"];
      const spammed = play(
        api,
        state,
        directions.map((direction) => ({ kind: "turn", player: Players.FIRST, direction })),
      );

      expect(NonEmpty.head(spammed.world.players).turns).toEqual(["down", "left"]);
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

          current = Game.step(api, current, {
            kind: "turn",
            player: Players.FIRST,
            direction,
          }).state;
          current = Game.step(api, current, { kind: "tick" }).state;
          if (current.kind === "over") return current.outcome.ending;
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
      expect(NonEmpty.head(played.world.players).score).toBeGreaterThan(0);

      const restarted = play(api, played, [{ kind: "restart" }]);

      expect(restarted.kind).toBe("playing");
      expect(NonEmpty.head(restarted.world.players).score).toBe(0);
      expect(Snake.length(NonEmpty.head(restarted.world.players).snake)).toBe(1);
      expect(NonEmpty.head(restarted.world.players).turns).toEqual([]);
      expect(restarted.world.board).toBe(played.world.board);
    });
  });
});

describe("turning", () => {
  test("two quick opposite turns cannot reverse the snake into itself", () => {
    onBoard(MEDIUM, 2, (api, state) => {
      const grown = play(api, state, ticks(1));
      const queued = play(api, grown, [
        { kind: "turn", player: Players.FIRST, direction: "down" },
        { kind: "turn", player: Players.FIRST, direction: "up" },
      ]);

      const after = play(api, queued, ticks(2));

      expect(after.kind).toBe("playing");
      expect(
        NonEmpty.head(after.world.players).snake.tail.some((s) =>
          Board.equals(s, NonEmpty.head(after.world.players).snake.head),
        ),
      ).toBe(false);
    });
  });

  test("a reversal you cannot make does not cost you the turn you actually wanted", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const asked = play(api, state, [
        { kind: "turn", player: Players.FIRST, direction: "left" },
        { kind: "turn", player: Players.FIRST, direction: "down" },
      ]);

      expect(NonEmpty.head(asked.world.players).turns).toEqual(["down"]);

      const ticked = play(api, asked, ticks(1));

      expect(NonEmpty.head(ticked.world.players).snake.facing).toBe("down");
      expect(
        NonEmpty.head(ticked.world.players).snake.head.row -
          NonEmpty.head(state.world.players).snake.head.row,
      ).toBe(1);
    });
  });

  test("pressing the way you are already going does not spend the buffer", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const asked = play(api, state, [
        { kind: "turn", player: Players.FIRST, direction: "right" },
        { kind: "turn", player: Players.FIRST, direction: "down" },
        { kind: "turn", player: Players.FIRST, direction: "left" },
      ]);

      expect(NonEmpty.head(asked.world.players).turns).toEqual(["down", "left"]);
    });
  });

  test("turns are ignored while paused", () => {
    onBoard(MEDIUM, 1, (api, state) => {
      const paused = play(api, state, [{ kind: "togglePause" }]);
      const attempted = play(api, paused, [
        { kind: "turn", player: Players.FIRST, direction: "down" },
      ]);

      expect(attempted.kind).toBe("paused");
      expect(NonEmpty.head(attempted.world.players).turns).toEqual([]);
    });
  });

  test("eating grows the snake by exactly one segment", () => {
    onBoard(LARGE, 11, (api, state) => {
      let current = state;
      let previousScore = 0;
      let previousLength = Snake.length(NonEmpty.head(current.world.players).snake);

      for (let i = 0; i < 200; i++) {
        current = Game.step(api, current, chase(current)).state;
        current = Game.step(api, current, { kind: "tick" }).state;
        if (current.kind === "over") break;

        const grew = Snake.length(NonEmpty.head(current.world.players).snake) - previousLength;
        const scored = NonEmpty.head(current.world.players).score - previousScore;

        expect(grew).toBeLessThanOrEqual(1);
        expect(scored).toBeLessThanOrEqual(1);

        previousLength = Snake.length(NonEmpty.head(current.world.players).snake);
        previousScore = NonEmpty.head(current.world.players).score;
      }

      expect(NonEmpty.head(current.world.players).score).toBeGreaterThan(0);
    });
  });
});

describe("invariants across many seeds", () => {
  test("the snake stays valid for 25 different games", () => {
    for (let seed = 0; seed < 25; seed++) {
      onBoard({ cols: 11, rows: 9 }, seed, (api, state) => {
        autoplay(api, state, 150, (current) => {
          const { snake, score } = NonEmpty.head(current.world.players);
          const cells = Snake.segments(snake).map(Board.key);

          expect(Snake.length(snake)).toBeLessThanOrEqual(1 + score);
          if (snake.growth === 0) expect(Snake.length(snake)).toBe(1 + score);

          expect(new Set(cells).size).toBe(cells.length);
          expect(
            Snake.segments(NonEmpty.head(current.world.players).snake).some((s) =>
              Board.equals(s, current.world.food),
            ),
          ).toBe(false);

          for (const segment of Snake.segments(NonEmpty.head(current.world.players).snake)) {
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
        if (Snake.length(NonEmpty.head(grown.world.players).snake) < 3) return;

        const { head, tail } = NonEmpty.head(grown.world.players).snake;
        const [neck] = tail;
        if (neck === undefined) return;

        const dc = head.col - neck.col;
        const dr = head.row - neck.row;

        const back: Geometry.Direction =
          dc > 0 ? "left" : dc < 0 ? "right" : dr > 0 ? "up" : "down";
        const side: Geometry.Direction = dc === 0 ? "left" : "up";

        const folded = play(api, grown, [
          { kind: "turn", player: Players.FIRST, direction: side },
          { kind: "turn", player: Players.FIRST, direction: back },
          { kind: "tick" },
        ]);

        const cells = Snake.segments(NonEmpty.head(folded.world.players).snake).map(Board.key);
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

        expect(Snake.length(NonEmpty.head(current.world.players).snake)).toBeGreaterThan(2);

        let picker = Rng.fromSeed(seed * 977 + 5);

        for (let i = 0; i < 220; i++) {
          const bursts = (i % 3) + 1;

          for (let n = 0; n < bursts; n++) {
            const [direction, next] = Rng.choose(
              picker,
              turns as NonEmpty.List<Geometry.Direction>,
            );
            picker = next;
            current = Game.step(api, current, {
              kind: "turn",
              player: Players.FIRST,
              direction,
            }).state;
          }

          current = Game.step(api, current, { kind: "tick" }).state;
          if (current.kind === "over") break;

          const cells = Snake.segments(NonEmpty.head(current.world.players).snake).map(Board.key);
          expect(new Set(cells).size).toBe(cells.length);
        }
      });
    }
  });

  test("pausing and resuming does not change how a game plays out", () => {
    const script: readonly Game.Command[] = [
      { kind: "turn", player: Players.FIRST, direction: "down" },
      ...ticks(4),
      { kind: "turn", player: Players.FIRST, direction: "right" },
      ...ticks(4),
      { kind: "turn", player: Players.FIRST, direction: "up" },
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

      expect(NonEmpty.head(withBreak.world.players).snake).toEqual(
        NonEmpty.head(straight.world.players).snake,
      );
      expect(NonEmpty.head(withBreak.world.players).score).toBe(
        NonEmpty.head(straight.world.players).score,
      );
      expect(withBreak.world.food).toEqual(straight.world.food);
    });
  });

  test("a scored point is never lost while the game continues", () => {
    onBoard(LARGE, 23, (api, state) => {
      let highest = 0;

      autoplay(api, state, 200, (current) => {
        expect(NonEmpty.head(current.world.players).score).toBeGreaterThanOrEqual(highest);
        highest = NonEmpty.head(current.world.players).score;
      });
    });
  });

  test("random command sequences never corrupt the world", () => {
    const commands: readonly Game.Command[] = [
      { kind: "tick" },
      { kind: "togglePause" },
      { kind: "restart" },
      { kind: "turn", player: Players.FIRST, direction: "up" },
      { kind: "turn", player: Players.FIRST, direction: "down" },
      { kind: "turn", player: Players.FIRST, direction: "left" },
      { kind: "turn", player: Players.FIRST, direction: "right" },
    ];

    for (let seed = 0; seed < 15; seed++) {
      onBoard({ cols: 9, rows: 9 }, seed, (api, state) => {
        let current = state;
        let picker = Rng.fromSeed(seed * 31 + 1);

        for (let i = 0; i < 250; i++) {
          const [choice, next] = Rng.choose(picker, commands as NonEmpty.List<Game.Command>);
          picker = next;
          current = Game.step(api, current, choice).state;

          const { board } = current.world;
          const { snake, score } = NonEmpty.head(current.world.players);
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
        expect(NonEmpty.head(restarted.world.players).score).toBe(0);
        expect(Snake.length(NonEmpty.head(restarted.world.players).snake)).toBe(1);
      }
    });
  });
});
