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
  onBoard((board) => Verdict.of(World.outcome(ending), who, paired(board, mine, theirs)));

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
    expect(said("collision", DEAD, DEAD)).toBe("A DRAW");
    expect(said("collision", { score: 4, alive: false }, DEAD)).toBe("YOU WIN");
    expect(said("collision", DEAD, { score: 4, alive: false })).toBe("THEY WIN");
  });

  test("filling the board is settled on score", () => {
    expect(said("filled", { score: 5, alive: true }, { score: 2, alive: true })).toBe("YOU WIN");
    expect(said("filled", { score: 2, alive: true }, { score: 5, alive: true })).toBe("THEY WIN");
    expect(said("filled", { score: 3, alive: true }, { score: 3, alive: true })).toBe("A DRAW");
  });
});
