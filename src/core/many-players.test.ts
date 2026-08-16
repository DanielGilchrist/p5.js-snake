import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Board from "./board";
import * as Game from "./game";
import * as Geometry from "./geometry";
import * as Player from "./player";
import * as State from "./game/state";
import * as World from "./world";
import * as Players from "./players";
import * as Rng from "./rng";
import * as Snake from "./snake";

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

describe("a full house", () => {
  const HALL: Board.GridSize = { cols: 24, rows: 18 };
  const MOST = 8;

  test("eight players all get a cell of their own", () => {
    onBoard(
      HALL,
      1,
      (_api, state) => {
        const heads = Players.everyone(state.world.players).map(
          ([, player]) => `${player.snake.head.col},${player.snake.head.row}`,
        );

        expect(Players.count(state.world.players)).toBe(MOST);
        expect(new Set(heads).size).toBe(MOST);
      },
      MOST,
    );
  });

  test("it still ends with one of them standing", () => {
    const seen = onBoard(HALL, 4, (api, state) => summarise(api, state, 600), MOST);

    expect(seen.over).toBe(true);
    expect(seen.living).toBeLessThanOrEqual(1);
    expect(seen.endings).toBe(1);
  });

  test("every event still inverts with a full house", () => {
    expect(onBoard(HALL, 3, (api, state) => invertsThroughout(api, state, 60), MOST)).toBe(true);
  });
});

const rightOf = <B>(api: Board.Api<B>, from: Board.Cell<B>): Board.Cell<B> => {
  const moved = api.move(from, Geometry.RIGHT);

  if (moved.kind !== Board.INSIDE) Assert.unreachable("the fixture must have room to the right");

  return moved.cell;
};

type Corpse = { readonly deaths: number; readonly ending: number };

const walkedInto = (away: boolean): Corpse => {
  const result = Board.parse(
    { cols: 10, rows: 10 },
    <B>(board: Board.Grid<B>, api: Board.Api<B>) => {
      const start = board.start;
      const ahead = rightOf(api, start);
      const lying = away ? Board.farthest(board, start) : ahead;
      const walking = Player.spawn(start, Geometry.RIGHT);
      const fallen = Player.withLife(Player.spawn(lying, Geometry.LEFT), false);
      const world = World.create({
        board,
        players: Players.of(walking, [fallen]),
        food: Board.farthest(board, ahead),
        rng: Rng.fromSeed(1),
        variant: World.variant(0),
      });

      const stepped = Game.step(api, State.playing({ world }), Game.tick);

      return {
        deaths: stepped.events.filter((event) => event.kind === Game.DIED).length,
        ending: stepped.events.filter((event) => event.kind === Game.ENDED).length,
      };
    },
  );

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

describe("the dead still take up room", () => {
  test("running into a corpse kills you", () => {
    expect(walkedInto(false).deaths).toBe(1);
  });

  test("a corpse lying elsewhere is harmless", () => {
    expect(walkedInto(true).deaths).toBe(0);
  });

  test("running into a corpse ends a two player match", () => {
    expect(walkedInto(false).ending).toBe(1);
  });
});

type Ambush = { readonly deaths: number; readonly closings: readonly World.Ending[] };

const tradedBeside = (bystanders: number): Ambush => {
  const result = Board.parse(
    { cols: 12, rows: 12 },
    <B>(board: Board.Grid<B>, api: Board.Api<B>) => {
      const { start } = board;
      const ahead = rightOf(api, start);
      const facing = Players.of(Player.spawn(start, Geometry.RIGHT), [
        Player.spawn(rightOf(api, ahead), Geometry.LEFT),
        ...Board.spawns(board, bystanders + 1)
          .slice(1)
          .map((at) => Player.spawn(at, at.col * 2 < board.cols ? Geometry.RIGHT : Geometry.LEFT)),
      ]);
      const world = World.create({
        board,
        players: facing,
        food: Board.farthest(board, ahead),
        rng: Rng.fromSeed(1),
        variant: World.variant(0),
      });

      const stepped = Game.step(api, State.playing({ world }), Game.tick);

      return {
        deaths: stepped.events.filter((event) => event.kind === Game.DIED).length,
        closings: stepped.events.flatMap((event) =>
          event.kind === Game.ENDED ? [event.ending] : [],
        ),
      };
    },
  );

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

describe("trading while others are still playing", () => {
  test("the last two trading draws the match", () => {
    const seen = tradedBeside(0);

    expect(seen.deaths).toBe(2);
    expect(seen.closings).toEqual(["traded"]);
  });

  test("a trade that leaves one alive hands them the win rather than a draw", () => {
    const seen = tradedBeside(1);

    expect(seen.deaths).toBe(2);
    expect(seen.closings).toEqual(["collision"]);
  });

  test("a trade with others still playing ends nothing at all", () => {
    const seen = tradedBeside(2);

    expect(seen.deaths).toBe(2);
    expect(seen.closings).toEqual([]);
  });
});
