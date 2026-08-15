import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Board from "./board";
import * as Player from "./player";
import * as Players from "./players";
import * as Verdict from "./verdict";
import * as World from "./world";

const SECOND = Players.id(1);

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

const said = (
  ending: World.Ending,
  mine: Standing,
  theirs: Standing,
  who: Players.Id = Players.FIRST,
): string =>
  onBoard((board) => Verdict.mineToLose(World.outcome(ending), who, paired(board, mine, theirs)));

const ALIVE = { score: 0, alive: true };
const DEAD = { score: 0, alive: false };

describe("verdict", () => {
  test("outliving the other player wins it", () => {
    expect(said("collision", ALIVE, DEAD)).toBe("YOU WIN");
  });

  test("dying while they live loses it", () => {
    expect(said("collision", DEAD, ALIVE)).toBe("THEY WIN");
  });

  test("the same ending reads the opposite way from the other seat", () => {
    expect(said("collision", DEAD, ALIVE, SECOND)).toBe("YOU WIN");
    expect(said("collision", ALIVE, DEAD, SECOND)).toBe("THEY WIN");
  });

  test("a same-tick double death falls back to score, and level scores draw", () => {
    expect(said("collision", DEAD, DEAD)).toBe("DRAW");
    expect(said("collision", { score: 4, alive: false }, DEAD)).toBe("YOU WIN");
    expect(said("collision", DEAD, { score: 4, alive: false })).toBe("THEY WIN");
  });

  test("filling the board is settled on score", () => {
    expect(said("filled", { score: 5, alive: true }, { score: 2, alive: true })).toBe("YOU WIN");
    expect(said("filled", { score: 2, alive: true }, { score: 5, alive: true })).toBe("THEY WIN");
    expect(said("filled", { score: 3, alive: true }, { score: 3, alive: true })).toBe("DRAW");
  });
});

describe("naming the winner", () => {
  const wonBy = (ending: World.Ending, mine: Standing, theirs: Standing): number | "draw" =>
    onBoard((board) => {
      const won = Verdict.winner(World.outcome(ending), paired(board, mine, theirs));

      return won.some ? Number(won.value) : "draw";
    });

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
