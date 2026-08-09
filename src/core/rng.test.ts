import { describe, expect, test } from "bun:test";

import * as NonEmpty from "./non-empty";
import * as Option from "./option";
import * as Rng from "./rng";

const SPREAD = 1_000_000;

const SEEDS = Array.from({ length: 50 }, (_, i) => Rng.fromSeed(i * 7919));

describe("rng", () => {
  test("nextInt stays within the bound", () => {
    for (const seed of SEEDS) {
      for (const bound of [1, 2, 7, 880]) {
        const [value] = Rng.nextInt(seed, bound);

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(bound);
      }
    }
  });

  test("the same seed always yields the same draw", () => {
    for (const seed of SEEDS) {
      expect(Rng.nextInt(seed, SPREAD)).toEqual(Rng.nextInt(seed, SPREAD));
    }
  });

  test("advancing the state changes the draw", () => {
    const [first, next] = Rng.nextInt(Rng.fromSeed(1), SPREAD);
    const [second] = Rng.nextInt(next, SPREAD);

    expect(first).not.toBe(second);
  });

  test("choose only ever returns a member of the list", () => {
    const xs: NonEmpty.List<string> = ["a", "b", "c", "d"];

    for (const seed of SEEDS) {
      const [picked] = Rng.choose(seed, xs);

      expect(xs).toContain(picked);
    }
  });

  test("choose eventually reaches every element", () => {
    const xs: NonEmpty.List<number> = [0, 1, 2];
    const seen = new Set(SEEDS.map((seed) => Rng.choose(seed, xs)[0]));

    expect(seen.size).toBe(xs.length);
  });
});

describe("non-empty", () => {
  test("head is total", () => {
    expect(NonEmpty.head([1])).toBe(1);
    expect(NonEmpty.head([1, 2, 3])).toBe(1);
  });

  test("prepend puts the new element first", () => {
    expect(NonEmpty.prepend(0, [1, 2])).toEqual([0, 1, 2]);
    expect(NonEmpty.prepend(0, [])).toEqual([0]);
  });

  test("fromArray rejects empty and accepts non-empty", () => {
    expect(NonEmpty.fromArray([]).some).toBe(false);
    expect(Option.getOrElse(NonEmpty.fromArray([1, 2]), [0])).toEqual([1, 2]);
  });

  test("at falls back to head rather than returning undefined", () => {
    const xs: NonEmpty.List<string> = ["a", "b"];

    expect(NonEmpty.at(xs, 1)).toBe("b");
    expect(NonEmpty.at(xs, 99)).toBe("a");
    expect(NonEmpty.at(xs, -1)).toBe("a");
  });
});
