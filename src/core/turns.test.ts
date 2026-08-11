import { describe, expect, test } from "bun:test";

import * as Option from "./option";
import * as Turns from "./turns";

const steered = (
  queue: Turns.Queue,
  facing: "up" | "down" | "left" | "right",
  direction: "up" | "down" | "left" | "right",
): Turns.Queue => Option.getOrElse(Turns.accept(queue, facing, direction), queue);

describe("turns", () => {
  test("a perpendicular turn is accepted", () => {
    expect(Turns.accept(Turns.EMPTY, "right", "up")).toEqual(Option.some(["up"]));
  });

  test("a reversal is refused, so it cannot displace anything", () => {
    expect(Turns.accept(Turns.EMPTY, "right", "left").some).toBe(false);
  });

  test("the way you are already going is refused", () => {
    expect(Turns.accept(Turns.EMPTY, "right", "right").some).toBe(false);
  });

  test("a second turn is judged against the first, not against the snake", () => {
    const queue = steered(Turns.EMPTY, "right", "up");

    expect(Turns.accept(queue, "right", "down").some).toBe(false);
    expect(Turns.accept(queue, "right", "left")).toEqual(Option.some(["up", "left"]));
  });

  test("a full buffer refuses rather than overwrites", () => {
    const queue = steered(steered(Turns.EMPTY, "right", "up"), "right", "left");

    expect(Turns.accept(queue, "right", "down").some).toBe(false);
    expect(queue).toEqual(["up", "left"]);
  });

  test("turns come back out in the order they went in", () => {
    const queue = steered(steered(Turns.EMPTY, "right", "up"), "right", "left");

    expect(Turns.next(queue)).toEqual(Option.some("up"));
    expect(Turns.next(Turns.afterFirst(queue))).toEqual(Option.some("left"));
    expect(Turns.next(Turns.afterFirst(Turns.afterFirst(queue))).some).toBe(false);
  });

  test("an empty queue heads wherever the snake already faces", () => {
    expect(Turns.facingAfter(Turns.EMPTY, "down")).toBe("down");
    expect(Turns.next(Turns.EMPTY).some).toBe(false);
    expect(Turns.afterFirst(Turns.EMPTY)).toEqual([]);
  });
});
