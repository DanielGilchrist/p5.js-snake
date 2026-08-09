import { describe, expect, test } from "bun:test";

import { withBoard, type Board, type BoardApi } from "./board";
import { newGame, step, type GameState } from "./game";
import { commandFor, parseKey } from "./input";
import { rng } from "./rng";

const onBoard = <R>(run: <B>(api: BoardApi<B>, state: GameState<B>) => R): R => {
  const result = withBoard({ cols: 10, rows: 10 }, <B>(board: Board<B>, api: BoardApi<B>) =>
    run(api, newGame(board, rng(1))),
  );

  if (!result.ok) throw new Error("fixture board must parse");

  return result.value;
};

describe("parseKey", () => {
  test("arrows and vim keys map to the same directions", () => {
    expect(parseKey("ArrowUp")).toEqual(parseKey("k"));
    expect(parseKey("ArrowDown")).toEqual(parseKey("j"));
    expect(parseKey("ArrowLeft")).toEqual(parseKey("h"));
    expect(parseKey("ArrowRight")).toEqual(parseKey("l"));
  });

  test("p is pause", () => {
    expect(parseKey("p")).toEqual({ kind: "pause" });
  });

  test("anything else parses as other rather than failing", () => {
    expect(parseKey("q")).toEqual({ kind: "other" });
    expect(parseKey("")).toEqual({ kind: "other" });
    expect(parseKey("toString")).toEqual({ kind: "other" });
  });
});

describe("commandFor", () => {
  test("unbound keys produce no command while playing", () => {
    onBoard((_api, state) => {
      expect(commandFor(state, parseKey("q")).some).toBe(false);
    });
  });

  test("any key restarts once the game is over", () => {
    onBoard((api, state) => {
      let over = state;
      for (let i = 0; i < 50 && over.kind !== "over"; i++) {
        over = step(api, over, { kind: "tick" }).state;
      }

      expect(over.kind).toBe("over");

      for (const raw of ["q", "p", "ArrowUp", ""]) {
        const command = commandFor(over, parseKey(raw));
        expect(command.some && command.value.kind).toBe("restart");
      }
    });
  });

  test("bound keys become turn commands", () => {
    onBoard((_api, state) => {
      const command = commandFor(state, parseKey("j"));
      expect(command.some && command.value).toEqual({ kind: "turn", direction: "down" });
    });
  });
});
