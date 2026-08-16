import { describe, expect, test } from "bun:test";

import * as Assert from "../core/assert";
import * as Board from "../core/board";
import * as Units from "../render/units";
import * as Pace from "./pace";

const paceOn = (cols: number, rows: number): Pace.Pace => {
  const result = Board.parse({ cols, rows }, <B>(board: Board.Grid<B>) => Pace.of(board));

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

const LAPTOP = paceOn(28, 18);

describe("how fast the game runs", () => {
  test("it starts at ten moves a second", () => {
    expect(Pace.gapFor(LAPTOP, 0)).toBe(LAPTOP.restful);
    expect(1000 / LAPTOP.restful).toBeCloseTo(10, 5);
  });

  test("every fruit shortens the gap between moves", () => {
    expect(Pace.gapFor(LAPTOP, 4) - Pace.gapFor(LAPTOP, 5)).toBeCloseTo(2, 5);
  });

  test("it stops speeding up once it reaches top speed", () => {
    const top = Pace.topSpeedAt(LAPTOP);

    expect(Pace.gapFor(LAPTOP, top)).toBe(LAPTOP.briskest);
    expect(Pace.gapFor(LAPTOP, top + 50)).toBe(LAPTOP.briskest);
    expect(Pace.gapFor(LAPTOP, 10_000)).toBe(LAPTOP.briskest);
  });

  test("a small board runs no slower than a big one", () => {
    expect(paceOn(12, 10).restful).toBe(LAPTOP.restful);
  });
});

describe("when the next move is due", () => {
  test("it waits for the gap to pass", () => {
    expect(Pace.due(LAPTOP, Units.millis(LAPTOP.restful - 1), 0, 0)).toBe(false);
    expect(Pace.due(LAPTOP, Units.millis(LAPTOP.restful), 0, 0)).toBe(true);
  });

  test("eating holds the world still for a moment longer", () => {
    const held = Pace.savour();

    expect(held).toBeGreaterThan(LAPTOP.restful);
    expect(Pace.due(LAPTOP, Units.millis(LAPTOP.restful), 0, held)).toBe(false);
    expect(Pace.due(LAPTOP, Units.millis(held), 0, held)).toBe(true);
  });
});

describe("how far between moves the drawing is", () => {
  test("it runs from nothing to all the way", () => {
    expect(Pace.partway(LAPTOP, Units.millis(0), 0)).toBe(0);
    expect(Pace.partway(LAPTOP, Units.millis(LAPTOP.restful / 2), 0)).toBeCloseTo(0.5, 5);
    expect(Pace.partway(LAPTOP, Units.millis(LAPTOP.restful), 0)).toBe(1);
  });

  test("it never runs past the next move, however late the frame is", () => {
    expect(Pace.partway(LAPTOP, Units.millis(9999), 0)).toBe(1);
  });

  test("it keeps pace with the speed up", () => {
    expect(Pace.partway(LAPTOP, Units.millis(Pace.gapFor(LAPTOP, 10)), 10)).toBe(1);
  });
});
