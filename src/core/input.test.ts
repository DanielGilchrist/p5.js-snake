import { describe, expect, test } from "bun:test";

import * as Assert from "./assert";
import * as Board from "./board";
import * as Game from "./game";
import * as Input from "./input";
import * as Rng from "./rng";

const onBoard = <R>(run: <B>(api: Board.Api<B>, state: Game.State<B>) => R): R => {
  const result = Board.parse({ cols: 10, rows: 10 }, <B>(board: Board.Grid<B>, api: Board.Api<B>) =>
    run(api, Game.start(board, Rng.fromSeed(1))),
  );

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

describe("parseKey", () => {
  test("arrows and vim keys map to the same directions", () => {
    expect(Input.parseKey("ArrowUp")).toEqual(Input.parseKey("k"));
    expect(Input.parseKey("ArrowDown")).toEqual(Input.parseKey("j"));
    expect(Input.parseKey("ArrowLeft")).toEqual(Input.parseKey("h"));
    expect(Input.parseKey("ArrowRight")).toEqual(Input.parseKey("l"));
  });

  test("p is pause", () => {
    expect(Input.parseKey("p")).toEqual({ kind: "pause" });
  });

  test("anything else parses as other rather than failing", () => {
    expect(Input.parseKey("q")).toEqual({ kind: "other" });
    expect(Input.parseKey("")).toEqual({ kind: "other" });
    expect(Input.parseKey("toString")).toEqual({ kind: "other" });
  });
});

describe("commandFor", () => {
  test("unbound keys produce no command while playing", () => {
    onBoard((_api, state) => {
      expect(Input.commandFor(state, Input.parseKey("q")).some).toBe(false);
    });
  });

  test("any key restarts once the game is over", () => {
    onBoard((api, state) => {
      let over = state;
      for (let i = 0; i < 50 && over.kind !== "over"; i++) {
        over = Game.step(api, over, { kind: "tick" }).state;
      }

      expect(over.kind).toBe("over");

      for (const raw of ["q", "p", "ArrowUp", ""]) {
        const command = Input.commandFor(over, Input.parseKey(raw));
        expect(command.some && command.value.kind).toBe("restart");
      }
    });
  });

  test("bound keys become turn commands", () => {
    onBoard((_api, state) => {
      const command = Input.commandFor(state, Input.parseKey("j"));
      expect(command.some && command.value).toEqual({ kind: "turn", direction: "down" });
    });
  });
});
