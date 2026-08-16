import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Board from "./board";
import * as NonEmpty from "./non-empty";
import * as Player from "./player";
import * as Players from "./players";
import * as Verdict from "./verdict";
import * as World from "./world";

const SECOND = Players.id(1);
const THIRD = Players.id(2);

const onBoard = <R>(run: <B>(board: Board.Grid<B>) => R): R => {
  const result = Board.parse({ cols: 10, rows: 10 }, <B>(board: Board.Grid<B>) => run(board));

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

type Standing = { readonly score: number; readonly alive: boolean };

const seated = <B>(at: Board.Cell<B>, of: Standing): Player.Type<B> =>
  Player.withLife(Player.withScore(Player.spawn(at, "right"), of.score), of.alive);

const paired = <B>(board: Board.Grid<B>, mine: Standing, theirs: Standing): Players.Type<B> =>
  Players.of(seated(board.start, mine), [seated(Board.farthest(board, board.start), theirs)]);

const ALIVE = { score: 0, alive: true };
const DEAD = { score: 0, alive: false };

const wonBy = (ending: World.Ending, mine: Standing, theirs: Standing): number | "draw" =>
  onBoard((board) => {
    const won = Verdict.winner(World.outcome(ending), paired(board, mine, theirs));

    return won.some ? Number(won.value) : "draw";
  });

describe("naming the winner", () => {
  test("the last one standing is the winner, whatever the scores say", () => {
    expect(wonBy("collision", { score: 0, alive: true }, { score: 9, alive: false })).toBe(0);
    expect(wonBy("collision", { score: 9, alive: false }, { score: 0, alive: true })).toBe(1);
  });

  test("a double death falls back to score", () => {
    expect(wonBy("collision", { score: 4, alive: false }, { score: 1, alive: false })).toBe(0);
    expect(wonBy("collision", { score: 1, alive: false }, { score: 4, alive: false })).toBe(1);
  });

  test("level scores with nobody standing is a draw", () => {
    expect(wonBy("collision", DEAD, DEAD)).toBe("draw");
    expect(wonBy("filled", { score: 3, alive: true }, { score: 3, alive: true })).toBe("draw");
  });
});

describe("showing the working", () => {
  const settledOn = (ending: World.Ending, mine: Standing, theirs: Standing): boolean =>
    onBoard((board) => Verdict.onScore(World.outcome(ending), paired(board, mine, theirs)));

  test("outliving them needs no scores to explain it", () => {
    expect(settledOn("collision", ALIVE, DEAD)).toBe(false);
  });

  test("a same-tick double death is settled on score", () => {
    expect(settledOn("collision", DEAD, DEAD)).toBe(true);
    expect(settledOn("collision", { score: 4, alive: false }, DEAD)).toBe(true);
  });

  test("filling the board is settled on score even with both alive", () => {
    expect(settledOn("filled", ALIVE, ALIVE)).toBe(true);
  });
});

describe("trading blows", () => {
  test("crashing into each other draws however the scores stand", () => {
    expect(wonBy("traded", { score: 9, alive: false }, DEAD)).toBe("draw");
    expect(wonBy("traded", DEAD, { score: 9, alive: false })).toBe("draw");
    expect(wonBy("traded", DEAD, DEAD)).toBe("draw");
  });

  test("a trade needs no scores to explain it", () => {
    expect(
      onBoard((board) =>
        Verdict.onScore(World.outcome("traded"), paired(board, { score: 9, alive: false }, DEAD)),
      ),
    ).toBe(false);
  });
});

const among = <B>(board: Board.Grid<B>, standings: readonly Standing[]): Players.Type<B> => {
  const places = Board.spawns(board, standings.length);
  const [first, ...rest] = standings.map((of, seat) => seated(NonEmpty.at(places, seat), of));

  if (first === undefined) Assert.unreachable("a table needs at least one player");

  return Players.of(first, rest);
};

const paidAmong = (
  ending: World.Ending,
  standings: readonly Standing[],
  fallen: readonly Players.Id[],
): readonly number[] =>
  onBoard((board) =>
    Verdict.rewarded(World.outcome(ending), among(board, standings), fallen).map(Number),
  );

describe("who a round pays", () => {
  test("a winner takes it alone", () => {
    expect(paidAmong("collision", [ALIVE, DEAD], [SECOND])).toEqual([0]);
  });

  test("a drawn one on one pays nobody, since a shared point is no result", () => {
    expect(paidAmong("traded", [DEAD, DEAD], [Players.FIRST, SECOND])).toEqual([]);
    expect(paidAmong("collision", [DEAD, DEAD], [Players.FIRST, SECOND])).toEqual([]);
  });

  test("a crowd pays the two who reached the end of a drawn round", () => {
    expect(paidAmong("traded", [DEAD, DEAD, DEAD], [SECOND, THIRD])).toEqual([1, 2]);
  });

  test("it pays the finalists, not everyone who ever played", () => {
    expect(paidAmong("traded", [DEAD, DEAD, DEAD], [THIRD])).toEqual([2]);
  });

  test("a survivor of a drawn crowd is paid alongside the fallen", () => {
    const standings = [
      { score: 3, alive: true },
      { score: 3, alive: false },
      { score: 1, alive: false },
    ];

    expect(paidAmong("filled", standings, [SECOND])).toEqual([0, 1]);
  });
});
