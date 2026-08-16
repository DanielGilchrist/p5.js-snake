import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Board from "./board";
import * as Game from "./game";
import * as Players from "./players";
import * as Rng from "./rng";
import * as Snake from "./snake";
import type * as World from "./world";

const ROOM: Board.GridSize = { cols: 12, rows: 12 };
const CORRIDOR: Board.GridSize = { cols: 9, rows: 3 };

const SECOND = Players.id(1);

const onBoard = <R>(
  size: Board.GridSize,
  seed: number,
  run: <B>(api: Board.Api<B>, state: Game.State<B>) => R,
  players = 2,
): R => {
  const result = Board.parse(size, <B>(board: Board.Grid<B>, api: Board.Api<B>) =>
    run(api, Game.start(board, Rng.fromSeed(seed), Game.forPlayers(players))),
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

const playerIn = <B>(state: Game.State<B>, who: Players.Id) => {
  const sitting = Players.at(state.world.players, who);

  if (!sitting.some) Assert.unreachable("a pair must seat both players");

  return sitting.value;
};

type Death = {
  readonly who: number;
  readonly col: number;
  readonly row: number;
  readonly tick: number;
};

type Summary = {
  readonly deaths: readonly Death[];
  readonly closings: readonly World.Ending[];
  readonly endings: number;
  readonly endedOn: readonly number[];
  readonly over: boolean;
  readonly living: number;
  readonly resting: readonly { readonly who: number; readonly col: number; readonly row: number }[];
};

const summarise = <B>(api: Board.Api<B>, from: Game.State<B>, limit: number): Summary => {
  const deaths: Death[] = [];
  const endedOn: number[] = [];
  const closings: World.Ending[] = [];
  let endings = 0;
  let current: Game.State<B> = from;

  for (let i = 0; i < limit && current.kind === "playing"; i++) {
    const stepped = Game.step(api, current, Game.tick);

    for (const event of stepped.events) {
      if (event.kind === "died") {
        deaths.push({
          who: Number(event.player),
          col: Number(event.at.col),
          row: Number(event.at.row),
          tick: i,
        });
      }

      if (event.kind === "ended") {
        endings += 1;
        endedOn.push(i);
        closings.push(event.ending);
      }
    }

    current = stepped.state;
  }

  return {
    deaths,
    closings,
    endings,
    endedOn,
    over: current.kind === "over",
    living: Players.living(current.world.players).length,
    resting: Players.everyone(current.world.players).map(([who, player]) => ({
      who: Number(who),
      col: Number(player.snake.head.col),
      row: Number(player.snake.head.row),
    })),
  };
};

const foodStaysClear = <B>(api: Board.Api<B>, from: Game.State<B>, limit: number): boolean => {
  let current: Game.State<B> = from;

  for (let i = 0; i < limit && current.kind === "playing"; i++) {
    for (const [, player] of Players.everyone(current.world.players)) {
      if (Snake.occupies(player.snake, current.world.food)) return false;
    }

    current = play(api, current, ticks(1));
  }

  return true;
};

const invertsThroughout = <B>(api: Board.Api<B>, from: Game.State<B>, limit: number): boolean => {
  let current: Game.State<B> = from;

  for (let i = 0; i < limit && current.kind === "playing"; i++) {
    const stepped = Game.step(api, current, Game.tick);
    const back = stepped.events.reduceRight(
      (carried: Game.State<B>, event) => Game.revert(carried, event),
      stepped.state,
    );

    if (JSON.stringify(back) !== JSON.stringify(current)) return false;

    current = stepped.state;
  }

  return true;
};

describe("two players", () => {
  test("they start apart and facing into the board", () => {
    onBoard(ROOM, 1, (_api, state) => {
      const first = playerIn(state, Players.FIRST);
      const second = playerIn(state, SECOND);

      expect(Players.count(state.world.players)).toBe(2);
      expect(Board.equals(first.snake.head, second.snake.head)).toBe(false);
      expect(first.snake.facing).toBe("right");
      expect(second.snake.facing).toBe("left");
      expect(first.alive).toBe(true);
      expect(second.alive).toBe(true);
    });
  });

  test("food never appears under anybody", () => {
    for (const seed of [1, 7, 23, 99]) {
      expect(onBoard(ROOM, seed, (api, state) => foodStaysClear(api, state, 40))).toBe(true);
    }
  });

  test("a turn only steers the player who asked for it", () => {
    onBoard(ROOM, 1, (api, state) => {
      const turned = play(api, state, [Game.turn(SECOND, "up")]);

      expect(playerIn(turned, SECOND).turns).toEqual(["up"]);
      expect(playerIn(turned, Players.FIRST).turns).toEqual([]);

      const ticked = play(api, turned, ticks(1));

      expect(playerIn(ticked, SECOND).snake.facing).toBe("up");
      expect(playerIn(ticked, Players.FIRST).snake.facing).toBe("right");
    });
  });

  test("both can steer within the same tick", () => {
    onBoard(ROOM, 1, (api, state) => {
      const turned = play(api, state, [Game.turn(Players.FIRST, "down"), Game.turn(SECOND, "up")]);
      const ticked = play(api, turned, ticks(1));

      expect(playerIn(ticked, Players.FIRST).snake.facing).toBe("down");
      expect(playerIn(ticked, SECOND).snake.facing).toBe("up");
    });
  });
});

describe("two players colliding", () => {
  test("driving head-on down a corridor kills both", () => {
    const seen = onBoard(CORRIDOR, 3, (api, state) => summarise(api, state, 12));

    expect(seen.over).toBe(true);
    expect(seen.deaths.length).toBe(2);
    expect(seen.deaths.map((death) => death.who).toSorted()).toEqual([0, 1]);
    expect(seen.endings).toBe(1);
    expect(seen.living).toBe(0);
  });

  test("a death records the cell that player came to rest in", () => {
    const seen = onBoard(CORRIDOR, 3, (api, state) => summarise(api, state, 12));

    for (const death of seen.deaths) {
      const resting = seen.resting.find((player) => player.who === death.who);

      expect(resting).toBeDefined();
      expect(resting?.col).toBe(death.col);
      expect(resting?.row).toBe(death.row);
    }
  });

  test("driving head-on is a trade, not a win for either of them", () => {
    const seen = onBoard(CORRIDOR, 3, (api, state) => summarise(api, state, 12));

    expect(seen.closings).toEqual(["traded"]);
  });

  test("the match closes exactly once", () => {
    const seen = onBoard(ROOM, 5, (api, state) => summarise(api, state, 400));

    expect(seen.over).toBe(true);
    expect(seen.endings).toBe(1);
  });

  test("dying at the same moment on separate walls is not a trade", () => {
    const seen = onBoard(ROOM, 5, (api, state) => summarise(api, state, 400));
    const [first, second] = seen.deaths;

    expect(seen.deaths.length).toBe(2);
    expect(first?.tick).toBe(second?.tick as number);
    expect(seen.closings).toEqual(["collision"]);
  });
});

describe("two players are still a pure fold", () => {
  test("every event inverts back to where it started", () => {
    for (const seed of [1, 4, 9]) {
      expect(onBoard(ROOM, seed, (api, state) => invertsThroughout(api, state, 60))).toBe(true);
    }
  });
});

describe("three players", () => {
  const ROOMY: Board.GridSize = { cols: 16, rows: 14 };

  test("all three start on cells of their own", () => {
    onBoard(
      ROOMY,
      1,
      (_api, state) => {
        const heads = Players.everyone(state.world.players).map(
          ([, player]) => `${player.snake.head.col},${player.snake.head.row}`,
        );

        expect(Players.count(state.world.players)).toBe(3);
        expect(new Set(heads).size).toBe(3);
      },
      3,
    );
  });

  test("one death is not enough to end it, unlike with two players", () => {
    const seen = onBoard(ROOMY, 2, (api, state) => summarise(api, state, 400), 3);
    const ending = Math.min(...seen.endedOn);
    const before = seen.deaths.filter((death) => death.tick <= ending);

    expect(seen.endings).toBe(1);
    expect(before.length).toBeGreaterThanOrEqual(2);
  });

  test("it ends with exactly one of them left alive", () => {
    const seen = onBoard(ROOMY, 2, (api, state) => summarise(api, state, 400), 3);

    expect(seen.over).toBe(true);
    expect(seen.living).toBe(1);
  });

  test("every event still inverts with three of them", () => {
    for (const seed of [2, 6]) {
      expect(onBoard(ROOMY, seed, (api, state) => invertsThroughout(api, state, 80), 3)).toBe(true);
    }
  });
});
