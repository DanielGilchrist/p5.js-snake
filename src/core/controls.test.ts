import { describe, expect, test } from "bun:test";

import * as Controls from "./controls";
import * as Option from "./option";

const turnAt = (assignment: Controls.Assignment, code: string): Option.Type<Controls.Turn> =>
  Controls.turnFrom(assignment, Controls.key(code));

describe("one player holding everything", () => {
  test("every scheme drives the only seat", () => {
    for (const code of ["ArrowUp", "w", "k"]) {
      expect(turnAt(Controls.shared, code)).toEqual(Option.some({ seat: 0, direction: "up" }));
    }
  });

  test("unbound keys turn nobody", () => {
    expect(turnAt(Controls.shared, "q").some).toBe(false);
  });
});

describe("sharing one keyboard", () => {
  const pair = Controls.between([Controls.ARROWS, Controls.WASD]);

  test("each seat answers to its own scheme", () => {
    expect(turnAt(pair, "ArrowLeft")).toEqual(Option.some({ seat: 0, direction: "left" }));
    expect(turnAt(pair, "a")).toEqual(Option.some({ seat: 1, direction: "left" }));
  });

  test("a scheme nobody holds drives nobody", () => {
    expect(turnAt(pair, "h").some).toBe(false);
  });

  test("the order of the schemes decides who gets which", () => {
    const flipped = Controls.between([Controls.WASD, Controls.ARROWS]);

    expect(turnAt(flipped, "a")).toEqual(Option.some({ seat: 0, direction: "left" }));
    expect(turnAt(flipped, "ArrowLeft")).toEqual(Option.some({ seat: 1, direction: "left" }));
  });

  test("a third player takes the next scheme along", () => {
    const trio = Controls.between([Controls.ARROWS, Controls.WASD, Controls.VIM]);

    expect(turnAt(trio, "j")).toEqual(Option.some({ seat: 2, direction: "down" }));
  });
});

describe("naming who holds what", () => {
  test("a seat is named after the schemes it holds", () => {
    expect(Controls.nameOf(Controls.between([Controls.ARROWS, Controls.WASD]), 1)).toBe("W A S D");
    expect(Controls.nameOf(Controls.shared, 0)).toBe("ARROWS / W A S D / H J K L");
  });

  test("a seat past the last assignment wraps rather than failing", () => {
    const pair = Controls.between([Controls.ARROWS, Controls.WASD]);

    expect(Controls.nameOf(pair, 2)).toBe(Controls.nameOf(pair, 0));
  });
});
