import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Autopilot from "./autopilot";
import * as Board from "./board";
import * as Game from "./game";
import type * as Geometry from "./geometry";
import type * as Option from "./option";
import * as Players from "./players";
import * as Rng from "./rng";
import * as Turns from "./turns";

const ROOM: Board.GridSize = { cols: 14, rows: 12 };
const PLAYERS: readonly Players.Id[] = [Players.FIRST, Players.id(1)];
const SEEDS: readonly number[] = [1, 5, 12];
const LIMIT = 300;

const onBoard = <R>(seed: number, run: <B>(api: Board.Api<B>, state: Game.State<B>) => R): R => {
  const result = Board.parse(ROOM, <B>(board: Board.Grid<B>, api: Board.Api<B>) =>
    run(api, Game.start(board, Rng.fromSeed(seed), Game.PAIR)),
  );

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

type Pick = {
  readonly picked: Geometry.Direction;
  readonly heading: Geometry.Direction;
  readonly legal: boolean;
};

type Flight = {
  readonly ticks: number;
  readonly scored: number;
  readonly picks: readonly Pick[];
};

const flown = <B>(api: Board.Api<B>, from: Game.State<B>, steered: boolean): Flight => {
  const picks: Pick[] = [];
  let current: Game.State<B> = from;
  let ticks = 0;

  while (current.kind === "playing" && ticks < LIMIT) {
    if (steered) {
      for (const who of PLAYERS) {
        const picked: Option.Type<Geometry.Direction> = Autopilot.choose(api, current.world, who);
        const sitting = Players.at(current.world.players, who);

        if (!picked.some || !sitting.some) continue;

        const { snake, turns } = sitting.value;

        picks.push({
          picked: picked.value,
          heading: Turns.facingAfter(turns, snake.facing),
          legal: Turns.accept(turns, snake.facing, picked.value).some,
        });

        current = Game.step(api, current, Game.turn(who, picked.value)).state;
      }
    }

    current = Game.step(api, current, Game.tick).state;
    ticks += 1;
  }

  return { ticks, scored: Players.scored(current.world.players), picks };
};

const flightFor = (seed: number, steered: boolean): Flight =>
  onBoard(seed, (api, state) => flown(api, state, steered));

describe("pilot", () => {
  test("it only ever picks a turn the rules would accept", () => {
    for (const seed of SEEDS) {
      const flight = flightFor(seed, true);

      expect(flight.picks.length).toBeGreaterThan(0);
      expect(flight.picks.every((pick) => pick.legal)).toBe(true);
    }
  });

  test("it never suggests the way it is already heading", () => {
    for (const seed of SEEDS) {
      const flight = flightFor(seed, true);

      expect(flight.picks.every((pick) => pick.picked !== pick.heading)).toBe(true);
    }
  });

  test("a piloted snake outlives one that never turns", () => {
    for (const seed of SEEDS) {
      expect(flightFor(seed, true).ticks).toBeGreaterThan(flightFor(seed, false).ticks);
    }
  });

  test("it chases food rather than merely surviving", () => {
    for (const seed of SEEDS) {
      expect(flightFor(seed, true).scored).toBeGreaterThanOrEqual(3);
    }
  });
});

const CROWD: readonly Players.Id[] = [Players.FIRST, Players.id(1), Players.id(2), Players.id(3)];

type Watch = {
  readonly steps: number;
  readonly intoBodies: number;
  readonly trades: number;
  readonly avoidableTrades: number;
};

const watched = <B>(api: Board.Api<B>, from: Game.State<B>): Watch => {
  let current: Game.State<B> = from;
  let ticks = 0;
  let steps = 0;
  let intoBodies = 0;
  let trades = 0;
  let avoidableTrades = 0;

  while (current.kind === Game.PLAYING && ticks < LIMIT) {
    for (const who of CROWD) {
      const seen = Autopilot.looksFor(api, current.world, who);
      const picked: Option.Type<Geometry.Direction> = Autopilot.choose(api, current.world, who);

      if (!picked.some) continue;

      const heading: Geometry.Direction = picked.value;
      const taken = seen.find((look) => look.heading === heading);

      steps += 1;

      if (taken === undefined) intoBodies += 1;
      else if (taken.contested) {
        trades += 1;
        if (seen.some((look) => !look.contested)) avoidableTrades += 1;
      }

      current = Game.step(api, current, Game.turn(who, heading)).state;
    }

    current = Game.step(api, current, Game.tick).state;
    ticks += 1;
  }

  return { steps, intoBodies, trades, avoidableTrades };
};

const watchFor = (seed: number): Watch => {
  const done = Board.parse({ cols: 18, rows: 14 }, <B>(board: Board.Grid<B>, api: Board.Api<B>) =>
    watched(api, Game.start(board, Rng.fromSeed(seed), Game.forPlayers(CROWD.length))),
  );

  if (!done.ok) Assert.unreachable("the crowded board must parse");

  return done.value;
};

const turnRate = (seed: number): number => {
  const flight = flightFor(seed, true);

  return flight.picks.length / (flight.ticks * PLAYERS.length);
};

describe("how the pilot carries itself", () => {
  const rates = Array.from({ length: 20 }, (_, seed) => turnRate(seed + 1));

  test("it mostly holds its line instead of weaving down the diagonal", () => {
    const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;

    expect(average).toBeLessThan(0.4);
  });

  test("but not every snake carries itself the same way", () => {
    expect(Math.max(...rates) - Math.min(...rates)).toBeGreaterThan(0.15);
  });
});

describe("what the pilot refuses to do", () => {
  test("it never steers into a snake, living or dead", () => {
    for (const seed of SEEDS) {
      const watch = watchFor(seed);

      expect(watch.steps).toBeGreaterThan(0);
      expect(watch.intoBodies).toBe(0);
    }
  });

  test("it only trades heads when it has no other way to go", () => {
    for (const seed of SEEDS) {
      expect(watchFor(seed).avoidableTrades).toBe(0);
    }
  });
});
