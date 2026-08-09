import { describe, expect, test } from "bun:test";

import * as Assert from "../../core/assert";
import * as Board from "../../core/board";
import * as Event from "../../core/event";
import * as Layout from "../layout";
import * as Units from "../units";
import * as Effects from "./index";

const BORN = Units.millis(0);

const onEvent = (make: <B>(at: Board.Cell<B>) => Event.Type<B>): readonly Effects.Effect[] => {
  const result = Board.parse(Board.size(12, 12), <B>(board: Board.Grid<B>) => {
    const layout = Layout.fit(board, Units.viewport(400, 400));

    return Effects.spawn(make(board.start), layout, BORN);
  });

  if (!result.ok) Assert.unreachable("fixture board must parse");

  return result.value;
};

const onEat = (): readonly Effects.Effect[] => onEvent((at) => Event.scored(at));

const onDeath = (): readonly Effects.Effect[] => onEvent((at) => Event.ended("collision", at));

const kindsOf = (effects: readonly Effects.Effect[]): Set<string> =>
  new Set(effects.map((effect) => effect.kind));

describe("effects", () => {
  test("eating stacks a puff, a swallow and a punch on the same beat", () => {
    const kinds = kindsOf(onEat());

    expect(kinds).toContain("puff");
    expect(kinds).toContain("swallow");
    expect(kinds).toContain("dust");
    expect(kinds).toContain("wisps");
    expect(kinds).toContain("crumbs");
    expect(kinds).toContain("shake");
  });

  test("eating does not borrow the death vocabulary", () => {
    const kinds = kindsOf(onEat());

    expect(kinds).not.toContain("shards");
    expect(kinds).not.toContain("dim");
  });

  test("the swallow outlasts the freeze so the food is seen going in", () => {
    const swallow = onEat().find((effect) => effect.kind === "swallow");

    if (swallow === undefined) Assert.unreachable("eating must spawn a swallow");

    expect(Effects.alive([swallow], Units.millis(60)).length).toBe(1);
    expect(Effects.alive([swallow], Units.millis(400))).toEqual([]);
  });

  test("the puff is the shortest-lived layer, so the dust settles after it", () => {
    const eaten = onEat();
    const outlives = (kind: string): boolean =>
      eaten
        .filter((effect) => effect.kind === kind)
        .every((effect) => Effects.alive([effect], Units.millis(200)).length === 1);

    expect(
      Effects.alive(
        eaten.filter((e) => e.kind === "puff"),
        Units.millis(200),
      ),
    ).toEqual([]);
    expect(outlives("crumbs")).toBe(true);
    expect(outlives("dust")).toBe(true);
  });

  test("dying shakes harder and longer than eating", () => {
    const punch = onEat().find((effect) => effect.kind === "shake");
    const quake = onDeath().find((effect) => effect.kind === "shake");

    if (punch?.kind !== "shake" || quake?.kind !== "shake") {
      Assert.unreachable("both events must shake");
    }

    expect(quake.strength).toBeGreaterThan(punch.strength);
    expect(quake.span).toBeGreaterThan(punch.span);
  });

  test("every effect expires once its lifespan elapses", () => {
    expect(Effects.alive(onEat(), Units.millis(50)).length).toBeGreaterThan(0);
    expect(Effects.alive(onEat(), Units.millis(10_000))).toEqual([]);
    expect(Effects.alive(onDeath(), Units.millis(10_000))).toEqual([]);
  });

  test("the screen only shakes while a shake is alive", () => {
    const eaten = onEat();
    const during = Effects.shakeOffset(eaten, Units.millis(10));

    expect(Math.abs(during.dx) + Math.abs(during.dy)).toBeGreaterThan(0);
    expect(
      Effects.shakeOffset(Effects.alive(eaten, Units.millis(10_000)), Units.millis(10_000)),
    ).toEqual(Units.NO_OFFSET);
  });

  test("nothing shakes when no shake was spawned", () => {
    const quiet = onEat().filter((effect) => effect.kind !== "shake");

    expect(Effects.shakeOffset(quiet, Units.millis(5))).toEqual(Units.NO_OFFSET);
  });

  test("winning is celebrated by the score, not by a death explosion", () => {
    expect(onEvent((at) => Event.ended("filled", at))).toEqual([]);
  });
});
