import { describe, expect, test } from "bun:test";

import * as Effects from "./effects";
import * as Palette from "./palette";
import * as Units from "./units";

const at = { x: Units.px(10), y: Units.px(10) };

describe("effects", () => {
  test("effects expire once their lifespan elapses", () => {
    const born = Units.millis(0);
    const spawned: readonly Effects.Effect[] = [
      { kind: "ring", at, colour: Palette.PAPER, born },
      { kind: "shards", at, born },
      { kind: "bloom", at, born },
    ];

    expect(Effects.alive(spawned, Units.millis(50)).length).toBe(spawned.length);
    expect(Effects.alive(spawned, Units.millis(10_000)).length).toBe(0);
  });

  test("the screen only shakes while a shake is alive", () => {
    const shake: readonly Effects.Effect[] = [{ kind: "shake", born: Units.millis(0) }];

    const during = Effects.shakeOffset(shake, Units.millis(10));
    expect(Math.abs(during.dx) + Math.abs(during.dy)).toBeGreaterThan(0);

    const after = Effects.shakeOffset(
      Effects.alive(shake, Units.millis(10_000)),
      Units.millis(10_000),
    );
    expect(after).toEqual({ dx: Units.px(0), dy: Units.px(0) });
  });

  test("nothing shakes when no shake was spawned", () => {
    const offset = Effects.shakeOffset(
      [{ kind: "ring", at, colour: Palette.PAPER, born: Units.millis(0) }],
      Units.millis(5),
    );

    expect(offset).toEqual({ dx: Units.px(0), dy: Units.px(0) });
  });
});
