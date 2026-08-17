import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Autopilot from "./autopilot";
import * as Board from "./board";
import * as Game from "./game";
import * as State from "./game/state";
import * as Geometry from "./geometry";
import type * as Option from "./option";
import * as Player from "./player";
import * as Players from "./players";
import * as Rng from "./rng";
import * as Snake from "./snake";
import * as World from "./world";

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
        mode: Game.forPlayers(2),
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
        mode: Game.forPlayers(2),
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

describe("a player dropping out", () => {
  test("they die where they stood and the rest play on", () => {
    onBoard(
      ROOM,
      1,
      (api, state) => {
        const before = playerIn(state, SECOND).snake.head;
        const stepped = Game.step(api, state, Game.drop(SECOND));
        const deaths = stepped.events.flatMap((event) => (event.kind === Game.DIED ? [event] : []));

        const [death] = deaths;

        expect(deaths.length).toBe(1);
        expect(death?.player).toBe(SECOND);
        expect(death !== undefined && Board.equals(death.at, before)).toBe(true);
        expect(playerIn(stepped.state, Players.FIRST).alive).toBe(true);
      },
      3,
    );
  });

  test("their body still blocks whoever runs into it", () => {
    onBoard(
      ROOM,
      1,
      (api, state) => {
        const gone = Game.step(api, state, Game.drop(SECOND)).state;
        const corpse = playerIn(gone, SECOND);

        expect(corpse.alive).toBe(false);
        expect(Snake.occupies(corpse.snake, corpse.snake.head)).toBe(true);
      },
      3,
    );
  });

  test("dropping to one player left ends the match", () => {
    onBoard(ROOM, 1, (api, state) => {
      const stepped = Game.step(api, state, Game.drop(SECOND));

      expect(stepped.events.some((event) => event.kind === Game.ENDED)).toBe(true);
      expect(stepped.state.kind).toBe(Game.OVER);
    });
  });

  test("dropping someone already gone changes nothing", () => {
    onBoard(
      ROOM,
      1,
      (api, state) => {
        const gone = Game.step(api, state, Game.drop(SECOND)).state;
        const again = Game.step(api, gone, Game.drop(SECOND));

        expect(again.events).toEqual([]);
        expect(again.state).toEqual(gone);
      },
      3,
    );
  });

  test("a drop still inverts back like every other event", () => {
    onBoard(
      ROOM,
      1,
      <B>(api: Board.Api<B>, state: Game.State<B>) => {
        const stepped = Game.step(api, state, Game.drop(SECOND));
        const back = stepped.events.reduceRight(
          (carried: Game.State<B>, event) => Game.revert(carried, event),
          stepped.state,
        );

        expect(JSON.stringify(back)).toBe(JSON.stringify(state));
      },
      3,
    );
  });
});

describe("starting long", () => {
  const LONG = 30;

  test("a snake asked to start long grows to that length as it moves", () => {
    const result = Board.parse(
      { cols: 28, rows: 18 },
      <B>(board: Board.Grid<B>, api: Board.Api<B>) => {
        let state: Game.State<B> = Game.start(board, Rng.fromSeed(1), Game.forPlayers(1, LONG));

        expect(playerIn(state, Players.FIRST).snake.tail.length).toBe(0);

        for (let i = 0; i < LONG && state.kind === Game.PLAYING; i++) {
          for (const [who] of Players.everyone(state.world.players)) {
            const picked: Option.Type<Geometry.Direction> = Autopilot.choose(api, state.world, who);

            if (picked.some) state = Game.step(api, state, Game.turn(who, picked.value)).state;
          }

          state = Game.step(api, state, Game.tick).state;
        }

        return playerIn(state, Players.FIRST).snake.tail.length + 1;
      },
    );

    if (!result.ok) Assert.unreachable("fixture board must parse");

    expect(result.value).toBe(LONG + 1);
  });

  test("no growth asked for leaves the game exactly as it was", () => {
    onBoard(ROOM, 1, (_api, state) => {
      for (const [, player] of Players.everyone(state.world.players)) {
        expect(player.snake.growth).toBe(0);
        expect(player.snake.tail.length).toBe(0);
      }
    });
  });

  test("every player at the table starts equally long", () => {
    const result = Board.parse({ cols: 28, rows: 18 }, <B>(board: Board.Grid<B>) => {
      const state = Game.start(board, Rng.fromSeed(1), Game.forPlayers(4, LONG));

      return Players.everyone(state.world.players).map(([, one]) => one.snake.growth);
    });

    if (!result.ok) Assert.unreachable("fixture board must parse");

    expect(result.value).toEqual([LONG, LONG, LONG, LONG]);
  });
});

const started = <B>(board: Board.Grid<B>, mode: Game.Mode): Game.State<B> =>
  Game.start(board, Rng.fromSeed(4), mode);

describe("restarting keeps the rules it started with", () => {
  test("a long game restarts long", () => {
    const result = Board.parse(
      { cols: 28, rows: 18 },
      <B>(board: Board.Grid<B>, api: Board.Api<B>) => {
        const again = Game.step(api, started(board, Game.forPlayers(4, 50)), Game.restart).state;

        return Players.everyone(again.world.players).map(([, one]) => one.snake.growth);
      },
    );

    if (!result.ok) Assert.unreachable("fixture board must parse");

    expect(result.value).toEqual([50, 50, 50, 50]);
  });

  test("the table keeps its size across a restart", () => {
    const result = Board.parse(
      { cols: 28, rows: 18 },
      <B>(board: Board.Grid<B>, api: Board.Api<B>) => {
        const again = Game.step(api, started(board, Game.forPlayers(6)), Game.restart).state;

        return Players.count(again.world.players);
      },
    );

    if (!result.ok) Assert.unreachable("fixture board must parse");

    expect(result.value).toBe(6);
  });

  test("a plain game restarts plain", () => {
    const result = Board.parse(
      { cols: 28, rows: 18 },
      <B>(board: Board.Grid<B>, api: Board.Api<B>) => {
        const again = Game.step(api, started(board, Game.SOLO), Game.restart).state;

        return Players.everyone(again.world.players).map(([, one]) => one.snake.growth);
      },
    );

    if (!result.ok) Assert.unreachable("fixture board must parse");

    expect(result.value).toEqual([0]);
  });
});

const at = <B>(board: Board.Grid<B>, col: number, row: number): Board.Cell<B> => {
  const found = board.playable.find((cell) => cell.col === col && cell.row === row);

  if (found === undefined) Assert.unreachable("fixture cell must be playable");

  return found;
};

const facing = <B>(
  board: Board.Grid<B>,
  col: number,
  row: number,
  direction: Geometry.Direction,
): Player.Type<B> => Player.spawn(at(board, col, row), direction);

describe("food is never left buried", () => {
  const tradingOntoFood = <B>(board: Board.Grid<B>): Game.State<B> =>
    State.playing({
      world: World.create({
        board,
        players: Players.of(facing(board, 2, 1, "right"), [
          facing(board, 4, 1, "left"),
          facing(board, 2, 11, "right"),
          facing(board, 13, 11, "left"),
        ]),
        food: at(board, 3, 1),
        rng: Rng.fromSeed(5),
        variant: World.variant(0),
        mode: Game.forPlayers(4),
      }),
    });

  const onTradeBoard = <R>(run: <B>(api: Board.Api<B>, state: Game.State<B>) => R): R => {
    const result = Board.parse(
      { cols: 16, rows: 14 },
      <B>(board: Board.Grid<B>, api: Board.Api<B>) => run(api, tradingOntoFood(board)),
    );

    if (!result.ok) Assert.unreachable("fixture board must parse");

    return result.value;
  };

  test("a trade onto the food cell moves the food off the bodies", () => {
    onTradeBoard((api, state) => {
      const traded = Game.step(api, state, Game.tick).state;

      expect(traded.kind).toBe("playing");
      expect(playerIn(traded, Players.FIRST).alive).toBe(false);
      expect(playerIn(traded, SECOND).alive).toBe(false);

      for (const [, player] of Players.everyone(traded.world.players)) {
        expect(Snake.occupies(player.snake, traded.world.food)).toBe(false);
      }
    });
  });

  test("the reseated food inverts back on a rewind", () => {
    const inverted = onTradeBoard(<B>(api: Board.Api<B>, state: Game.State<B>) => {
      const stepped = Game.step(api, state, Game.tick);
      const back = stepped.events.reduceRight(
        (carried: Game.State<B>, event) => Game.revert(carried, event),
        stepped.state,
      );

      return JSON.stringify(back) === JSON.stringify(state);
    });

    expect(inverted).toBe(true);
  });
});
