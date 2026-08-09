import { describe, expect, test } from "bun:test";

import { at, fromArray, head, prepend, type NonEmpty } from "./non-empty";
import { choose, nextFloat, nextInt, rng } from "./rng";

const SEEDS = Array.from({ length: 50 }, (_, i) => rng(i * 7919));

describe("rng", () => {
  test("nextFloat stays in [0, 1)", () => {
    for (const seed of SEEDS) {
      const [value] = nextFloat(seed);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test("nextInt stays within the bound", () => {
    for (const seed of SEEDS) {
      for (const bound of [1, 2, 7, 880]) {
        const [value] = nextInt(seed, bound);

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(bound);
      }
    }
  });

  test("the same seed always yields the same draw", () => {
    for (const seed of SEEDS) {
      expect(nextFloat(seed)).toEqual(nextFloat(seed));
    }
  });

  test("advancing the state changes the draw", () => {
    const [first, next] = nextFloat(rng(1));
    const [second] = nextFloat(next);

    expect(first).not.toBe(second);
  });

  test("choose only ever returns a member of the list", () => {
    const xs: NonEmpty<string> = ["a", "b", "c", "d"];

    for (const seed of SEEDS) {
      const [picked] = choose(seed, xs);

      expect(xs).toContain(picked);
    }
  });

  test("choose eventually reaches every element", () => {
    const xs: NonEmpty<number> = [0, 1, 2];
    const seen = new Set(SEEDS.map((seed) => choose(seed, xs)[0]));

    expect(seen.size).toBe(xs.length);
  });
});

describe("non-empty", () => {
  test("head is total", () => {
    expect(head([1])).toBe(1);
    expect(head([1, 2, 3])).toBe(1);
  });

  test("prepend puts the new element first", () => {
    expect(prepend(0, [1, 2])).toEqual([0, 1, 2]);
    expect(prepend(0, [])).toEqual([0]);
  });

  test("fromArray rejects empty and accepts non-empty", () => {
    expect(fromArray([])).toBeUndefined();
    expect(fromArray([1, 2])).toEqual([1, 2]);
  });

  test("at falls back to head rather than returning undefined", () => {
    const xs: NonEmpty<string> = ["a", "b"];

    expect(at(xs, 1)).toBe("b");
    expect(at(xs, 99)).toBe("a");
    expect(at(xs, -1)).toBe("a");
  });
});
