import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Board from "./board";
import * as Game from "./game";
import * as Option from "./option";
import * as Rng from "./rng";
import * as Verdict from "./verdict";
import * as Players from "./players";
import * as Standings from "./standings";

const SECOND = Players.id(1);
const THIRD = Players.id(2);

describe("keeping score across rounds", () => {
  test("everyone starts on nothing", () => {
    expect(Standings.blank(3)).toEqual([0, 0, 0]);
    expect(Standings.rounds(Standings.blank(3))).toBe(0);
  });

  test("winning a round is worth a point to the winner alone", () => {
    const after = Standings.award(Standings.blank(2), Option.some(Players.FIRST));

    expect(Standings.wonBy(after, Players.FIRST)).toBe(1);
    expect(Standings.wonBy(after, SECOND)).toBe(0);
  });

  test("a drawn round is worth nothing to anybody", () => {
    const after = Standings.award(Standings.blank(2), Option.none);

    expect(after).toEqual([0, 0]);
    expect(Standings.rounds(after)).toBe(0);
  });

  test("points accumulate over rounds", () => {
    const played = [
      Option.some(Players.FIRST),
      Option.some(SECOND),
      Option.none,
      Option.some(Players.FIRST),
    ];
    const after = played.reduce(Standings.award, Standings.blank(2));

    expect(after).toEqual([2, 1]);
    expect(Standings.rounds(after)).toBe(3);
  });

  test("it counts any number of players, not just two", () => {
    const after = [Option.some(THIRD), Option.some(THIRD), Option.some(Players.FIRST)].reduce(
      Standings.award,
      Standings.blank(4),
    );

    expect(after).toEqual([1, 0, 2, 0]);
    expect(Standings.ahead(after)).toEqual([THIRD]);
  });

  test("nobody is ahead before a round is won", () => {
    expect(Standings.ahead(Standings.blank(3))).toEqual([]);
  });

  test("level players are all ahead together", () => {
    const after = [Option.some(Players.FIRST), Option.some(SECOND)].reduce(
      Standings.award,
      Standings.blank(3),
    );

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
        standings = Standings.award(standings, Verdict.winner(state.outcome, state.world.players));
      }
    }

    return standings;
  });

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

describe("awarding real matches", () => {
  test("a round settled by a survivor hands its winner exactly one point", () => {
    const after = played({ cols: 12, rows: 12 }, 5);

    expect(Standings.rounds(after)).toBeLessThanOrEqual(1);
    expect(after.filter((won) => won > 0).length).toBe(Standings.rounds(after));
  });

  test("a head-on trade leaves the standings untouched", () => {
    expect(played({ cols: 9, rows: 3 }, 3)).toEqual([0, 0]);
  });
});
