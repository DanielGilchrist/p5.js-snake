import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Board from "./board";
import * as Game from "./game";
import * as Geometry from "./geometry";
import * as Player from "./player";
import * as Players from "./players";
import * as Rng from "./rng";
import * as State from "./game/state";
import * as World from "./world";
import * as Verdict from "./verdict";
import * as Standings from "./standings";

const SECOND = Players.id(1);
const THIRD = Players.id(2);

describe("keeping score across rounds", () => {
  test("everyone starts on nothing", () => {
    expect(Standings.blank(3)).toEqual([0, 0, 0]);
    expect(Standings.points(Standings.blank(3))).toBe(0);
  });

  test("winning a round is worth a point to the winner alone", () => {
    const after = Standings.award(Standings.blank(2), [Players.FIRST]);

    expect(Standings.wonBy(after, Players.FIRST)).toBe(1);
    expect(Standings.wonBy(after, SECOND)).toBe(0);
  });

  test("a drawn round pays everyone who shared it", () => {
    const after = Standings.award(Standings.blank(3), [Players.FIRST, SECOND]);

    expect(after).toEqual([1, 1, 0]);
  });

  test("awarding nobody leaves the standings alone", () => {
    expect(Standings.award(Standings.blank(2), [])).toEqual([0, 0]);
  });

  test("points accumulate over rounds", () => {
    const played = [[Players.FIRST], [SECOND], [Players.FIRST, SECOND], [Players.FIRST]];
    const after = played.reduce(Standings.award, Standings.blank(2));

    expect(after).toEqual([3, 2]);
  });

  test("it counts any number of players, not just two", () => {
    const after = [[THIRD], [THIRD], [Players.FIRST]].reduce(Standings.award, Standings.blank(4));

    expect(after).toEqual([1, 0, 2, 0]);
    expect(Standings.ahead(after)).toEqual([THIRD]);
  });

  test("nobody is ahead before a round is won", () => {
    expect(Standings.ahead(Standings.blank(3))).toEqual([]);
  });

  test("level players are all ahead together", () => {
    const after = [[Players.FIRST], [SECOND]].reduce(Standings.award, Standings.blank(3));

    expect(Standings.ahead(after)).toEqual([Players.FIRST, SECOND]);
  });
});

const played = (size: Board.GridSize, seed: number): Standings.Type => {
  const result = Board.parse(size, <B>(board: Board.Grid<B>, api: Board.Api<B>) => {
    let state: Game.State<B> = Game.start(board, Rng.fromSeed(seed), Game.forPlayers(2));
    let standings = Standings.blank(2);

    for (let i = 0; i < 400 && state.kind !== Game.OVER; i++) {
      const stepped = Game.step(api, state, Game.tick);

      state = stepped.state;

      if (state.kind === Game.OVER && stepped.events.some((e) => e.kind === Game.ENDED)) {
        const fallen = stepped.events.flatMap((event) =>
          event.kind === Game.DIED ? [event.player] : [],
        );

        standings = Standings.award(
          standings,
          Verdict.rewarded(state.outcome, state.world.players, fallen),
        );
      }
    }

    return standings;
  });

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

const lastOneStanding = (): Standings.Type => {
  const result = Board.parse(
    { cols: 10, rows: 10 },
    <B>(board: Board.Grid<B>, api: Board.Api<B>) => {
      const cornered = Board.farthest(board, board.start);
      const world = World.create({
        board,
        players: Players.of(Player.spawn(board.start, Geometry.RIGHT), [
          Player.spawn(cornered, Geometry.RIGHT),
        ]),
        food: board.start,
        rng: Rng.fromSeed(1),
        variant: World.variant(0),
      });

      const stepped = Game.step(api, State.playing({ world }), Game.tick);
      const fallen = stepped.events.flatMap((event) =>
        event.kind === Game.DIED ? [event.player] : [],
      );

      if (stepped.state.kind !== Game.OVER) Assert.unreachable("the cornered player must die");

      return Standings.award(
        Standings.blank(2),
        Verdict.rewarded(stepped.state.outcome, stepped.state.world.players, fallen),
      );
    },
  );

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

describe("awarding real matches", () => {
  test("outliving them takes the whole point", () => {
    expect(lastOneStanding()).toEqual([1, 0]);
  });

  test("a drawn one on one leaves the standings where they were", () => {
    expect(played({ cols: 12, rows: 12 }, 5)).toEqual([0, 0]);
  });

  test("a head-on trade in a one on one pays nobody either", () => {
    expect(played({ cols: 9, rows: 3 }, 3)).toEqual([0, 0]);
  });
});
