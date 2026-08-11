import { describe, expect, test } from "bun:test";

import * as Pad from "./pad";
import * as Units from "./units";

const PHONE = Units.viewport(390, 844);
const TALL = Units.viewport(430, 932);
const SMALL = Units.viewport(360, 800);
const LANDSCAPE = Units.viewport(844, 390);

const SHAPES = [PHONE, TALL, SMALL, LANDSCAPE];

const CONTROLS: readonly Pad.Control[] = ["up", "down", "left", "right", "pause", "menu"];

const HANDS: readonly Pad.Hand[] = ["right", "left"];

const inside = (of: Units.Region, x: number, y: number): boolean =>
  x >= of.left && x <= of.left + of.width && y >= of.top && y <= of.top + of.height;

describe("pad", () => {
  test("pressing an arm reports its direction", () => {
    for (const viewport of SHAPES)
      for (const hand of HANDS) {
        const { pad } = Pad.arrange(viewport, hand);

        for (const control of CONTROLS) {
          const found = Pad.hit(pad, Pad.armOf(pad, control));

          expect(found.some).toBe(true);
          if (found.some) expect(found.value).toBe(control);
        }
      }
  });

  test("the whole cross is live, so a sloppy thumb still turns", () => {
    for (const viewport of SHAPES)
      for (const hand of HANDS) {
        const { pad } = Pad.arrange(viewport, hand);
        const edge = pad.span * 0.94;

        const corners: readonly (readonly [number, number, Pad.Control])[] = [
          [0, -edge, "up"],
          [0, edge, "down"],
          [-edge, 0, "left"],
          [edge, 0, "right"],
          [edge * 0.6, -edge * 0.9, "up"],
          [-edge * 0.9, edge * 0.6, "left"],
        ];

        for (const [dx, dy, want] of corners) {
          const found = Pad.hit(pad, Units.point(pad.seat.x + dx, pad.seat.y + dy));

          expect(found.some).toBe(true);
          if (found.some) expect(found.value).toBe(want);
        }
      }
  });

  test("the middle of the cross is a dead zone rather than a guess", () => {
    for (const viewport of SHAPES)
      for (const hand of HANDS) {
        const { pad } = Pad.arrange(viewport, hand);

        expect(Pad.hit(pad, pad.seat).some).toBe(false);
      }
  });

  test("the play area never sits under the controls", () => {
    for (const viewport of SHAPES)
      for (const hand of HANDS) {
        const { stage, pad } = Pad.arrange(viewport, hand);

        expect(inside(stage, pad.seat.x, pad.seat.y)).toBe(false);
        expect(inside(stage, pad.pause.x, pad.pause.y)).toBe(false);

        for (const control of CONTROLS) {
          const arm = Pad.armOf(pad, control);

          expect(inside(stage, arm.x, arm.y)).toBe(false);
        }
      }
  });

  test("the case, the screen and the controls all fit on the display", () => {
    for (const viewport of SHAPES)
      for (const hand of HANDS) {
        const { device, stage, pad } = Pad.arrange(viewport, hand);

        expect(device.left).toBeGreaterThan(0);
        expect(device.left + device.width).toBeLessThanOrEqual(viewport.width);
        expect(device.top + device.height).toBeLessThanOrEqual(viewport.height);

        expect(inside(device, stage.left, stage.top)).toBe(true);
        expect(inside(device, stage.left + stage.width, stage.top + stage.height)).toBe(true);

        expect(pad.seat.x - pad.span).toBeGreaterThanOrEqual(device.left);
        expect(pad.seat.y + pad.span).toBeLessThanOrEqual(device.top + device.height);
        expect(pad.pause.x + pad.button).toBeLessThanOrEqual(device.left + device.width);
      }
  });

  test("the cross and the button never overlap", () => {
    for (const viewport of SHAPES)
      for (const hand of HANDS) {
        const { pad } = Pad.arrange(viewport, hand);
        for (const round of ["pause", "menu"] as const) {
          const at = Pad.armOf(pad, round);
          const gap = Math.hypot(pad.seat.x - at.x, pad.seat.y - at.y);

          expect(gap).toBeGreaterThan(pad.span + pad.button);
        }

        const between = Math.hypot(pad.pause.x - pad.menu.x, pad.pause.y - pad.menu.y);

        expect(between).toBeGreaterThan(pad.button * 2);
      }
  });

  test("every target is big enough for a thumb", () => {
    for (const viewport of SHAPES)
      for (const hand of HANDS) {
        const { pad } = Pad.arrange(viewport, hand);

        expect(pad.arm * 2).toBeGreaterThanOrEqual(44);
        expect(pad.button * 2).toBeGreaterThanOrEqual(44);
      }
  });

  test("a tap on the screen is not a control", () => {
    for (const viewport of SHAPES)
      for (const hand of HANDS) {
        const { stage, pad } = Pad.arrange(viewport, hand);

        expect(Pad.hit(pad, Units.point(stage.left + stage.width / 2, stage.top + 10)).some).toBe(
          false,
        );
      }
  });

  test("only the cross steers, so sliding onto a button does not turn", () => {
    for (const control of CONTROLS) {
      expect(Pad.steers(control)).toBe(control !== "pause" && control !== "menu");
    }
  });

  test("sliding across the cross reports each arm it crosses", () => {
    for (const viewport of SHAPES)
      for (const hand of HANDS) {
        const { pad } = Pad.arrange(viewport, hand);
        const step = pad.span / 12;
        const seen: Pad.Control[] = [];

        for (let x = pad.seat.x - pad.span; x <= pad.seat.x + pad.span; x += step) {
          const found = Pad.hit(pad, Units.point(x, pad.seat.y));

          if (!found.some) continue;
          if (seen[seen.length - 1] === found.value) continue;

          seen.push(found.value);
        }

        expect(seen).toEqual(["left", "right"]);
      }
  });

  test("directions turn, pause pauses, and flip is not a game input", () => {
    for (const control of CONTROLS) {
      const key = Pad.keyOf(control);

      if (control === "menu") {
        expect(key.some).toBe(false);
        continue;
      }

      expect(key.some).toBe(true);
      if (!key.some) continue;

      if (control === "pause") {
        expect(key.value.kind).toBe("pause");
        continue;
      }

      expect(key.value.kind).toBe("turn");
      if (key.value.kind === "turn") expect(key.value.direction).toBe(control);
    }
  });

  test("upright, flipping hands mirrors the controls but keeps the screen put", () => {
    for (const viewport of [PHONE, TALL, SMALL]) {
      const right = Pad.arrange(viewport, "right");
      const left = Pad.arrange(viewport, "left");

      expect(left.stage).toEqual(right.stage);

      const middle = right.device.left + right.device.width / 2;

      expect(right.pad.seat.x).toBeGreaterThan(middle);
      expect(left.pad.seat.x).toBeLessThan(middle);
      expect(right.pad.pause.x).toBeLessThan(middle);
      expect(left.pad.pause.x).toBeGreaterThan(middle);
    }
  });

  test("sideways, every control sits on the held side and the screen takes the rest", () => {
    const right = Pad.arrange(LANDSCAPE, "right");
    const left = Pad.arrange(LANDSCAPE, "left");
    const middle = right.device.left + right.device.width / 2;

    for (const control of CONTROLS) {
      expect(Pad.armOf(right.pad, control).x).toBeGreaterThan(middle);
      expect(Pad.armOf(left.pad, control).x).toBeLessThan(middle);
    }

    expect(right.pad.menu.y).toBeLessThan(right.pad.seat.y);
    expect(right.pad.pause.y).toBeLessThan(right.pad.menu.y);

    expect(left.stage.width).toBeCloseTo(right.stage.width, 6);
    expect(left.stage.height).toBeCloseTo(right.stage.height, 6);
    expect(right.stage.left).toBeLessThan(left.stage.left);
  });

  test("sideways, the screen never sits under the controls", () => {
    for (const hand of HANDS) {
      const { pad, stage } = Pad.arrange(LANDSCAPE, hand);
      const edge = hand === "right" ? stage.left + stage.width : stage.left;

      const spans: readonly (readonly [number, number])[] = [
        [pad.seat.x, pad.span],
        [pad.pause.x, pad.button],
        [pad.menu.x, pad.button],
      ];

      for (const [centre, reach] of spans) {
        if (hand === "right") expect(centre - reach).toBeGreaterThan(edge);
        else expect(centre + reach).toBeLessThan(edge);
      }
    }
  });
});
