import * as Assert from "../core/assert";
import type * as Geometry from "../core/geometry";
import * as Input from "../core/input";
import * as Option from "../core/option";
import * as Units from "./units";

export type Control = "up" | "down" | "left" | "right" | "pause" | "flip";

export type Hand = "right" | "left";

export type Pad = {
  readonly seat: Units.Point;
  readonly span: Units.Px;
  readonly arm: Units.Px;
  readonly pause: Units.Point;
  readonly flip: Units.Point;
  readonly button: Units.Px;
};

export type Handheld = {
  readonly device: Units.Region;
  readonly stage: Units.Region;
  readonly pad: Pad;
};

const CASE_MARGIN = 0.022;
const CASE_PAD = 0.035;
const STAGE_SHARE = 0.66;

const CROSS_SPAN = 0.22;
const CROSS_ARM = 0.083;
const BUTTON_RADIUS = 0.085;
const DEAD_ZONE = 0.2;

const CROSS_SIDE = 0.72;
const KEYS_SIDE = 0.23;
const KEYS_HIGH = 0.36;
const KEYS_LOW = 0.7;

const pad = (seat: Units.Point, pause: Units.Point, flip: Units.Point, scale: number): Pad => ({
  seat,
  span: Units.px(scale * CROSS_SPAN),
  arm: Units.px(scale * CROSS_ARM),
  pause,
  flip,
  button: Units.px(scale * BUTTON_RADIUS),
});

const across = (device: Units.Region, share: number, hand: Hand): number =>
  device.left + device.width * (hand === "right" ? share : 1 - share);

export const arrange = (viewport: Units.Viewport, hand: Hand): Handheld => {
  const shortest = Math.min(viewport.width, viewport.height);
  const margin = shortest * CASE_MARGIN;
  const inset = shortest * CASE_PAD;
  const upright = viewport.height >= viewport.width;

  const device = Units.region({
    left: margin,
    top: margin,
    width: viewport.width - margin * 2,
    height: viewport.height - margin * 2,
  });

  if (upright) {
    const screenHeight = (device.height - inset * 3) * STAGE_SHARE;
    const deck = device.top + inset * 2 + screenHeight;
    const rest = device.top + device.height - deck;

    return {
      device,
      stage: Units.region({
        left: device.left + inset,
        top: device.top + inset,
        width: device.width - inset * 2,
        height: screenHeight,
      }),
      pad: pad(
        Units.point(across(device, CROSS_SIDE, hand), deck + rest * 0.5),
        Units.point(across(device, KEYS_SIDE, hand), deck + rest * KEYS_HIGH),
        Units.point(across(device, KEYS_SIDE, hand), deck + rest * KEYS_LOW),
        shortest,
      ),
    };
  }

  const flank = device.width * 0.22;

  return {
    device,
    stage: Units.region({
      left: device.left + flank,
      top: device.top + inset,
      width: device.width - flank * 2,
      height: device.height - inset * 2,
    }),
    pad: pad(
      Units.point(
        across(device, 1 - flank / device.width / 2, hand),
        device.top + device.height * 0.55,
      ),
      Units.point(
        across(device, flank / device.width / 2, hand),
        device.top + device.height * 0.42,
      ),
      Units.point(
        across(device, flank / device.width / 2, hand),
        device.top + device.height * 0.74,
      ),
      shortest,
    ),
  };
};

export const hit = (of: Pad, at: Units.Point): Option.Type<Control> => {
  if (Math.hypot(at.x - of.pause.x, at.y - of.pause.y) <= of.button) return Option.some("pause");
  if (Math.hypot(at.x - of.flip.x, at.y - of.flip.y) <= of.button) return Option.some("flip");

  const dx = at.x - of.seat.x;
  const dy = at.y - of.seat.y;

  if (Math.abs(dx) > of.span || Math.abs(dy) > of.span) return Option.none;
  if (Math.hypot(dx, dy) < of.span * DEAD_ZONE) return Option.none;

  if (Math.abs(dx) > Math.abs(dy)) return Option.some(dx > 0 ? "right" : "left");

  return Option.some(dy > 0 ? "down" : "up");
};

export const armOf = (of: Pad, control: Control): Units.Point => {
  const out = of.span * 0.62;

  switch (control) {
    case "up":
      return Units.point(of.seat.x, of.seat.y - out);
    case "down":
      return Units.point(of.seat.x, of.seat.y + out);
    case "left":
      return Units.point(of.seat.x - out, of.seat.y);
    case "right":
      return Units.point(of.seat.x + out, of.seat.y);
    case "pause":
      return of.pause;
    case "flip":
      return of.flip;
    default:
      return Assert.never(control);
  }
};

const facing = (control: Control): Option.Type<Geometry.Direction> => {
  switch (control) {
    case "up":
      return Option.some("up");
    case "down":
      return Option.some("down");
    case "left":
      return Option.some("left");
    case "right":
      return Option.some("right");
    case "pause":
    case "flip":
      return Option.none;
    default:
      return Assert.never(control);
  }
};

export const keyOf = (control: Control): Option.Type<Input.Key> => {
  const direction = facing(control);

  if (direction.some) return Option.some(Input.turn(direction.value));

  return control === "pause" ? Option.some(Input.pause) : Option.none;
};

export const other = (hand: Hand): Hand => (hand === "right" ? "left" : "right");
