import * as Assert from "../core/assert";
import * as Geometry from "../core/geometry";
import * as Input from "../core/input";
import * as Option from "../core/option";
import * as Units from "./units";

export const PAUSE = "pause";
export const MENU = "menu";

export type Control = Geometry.Direction | typeof PAUSE | typeof MENU;

export const SWITCHES: readonly Control[] = [PAUSE, MENU];

export const RIGHT_HAND = "right";
export const LEFT_HAND = "left";

export type Hand = typeof RIGHT_HAND | typeof LEFT_HAND;

export type Pad = {
  readonly seat: Units.Point;
  readonly span: Units.Px;
  readonly arm: Units.Px;
  readonly pause: Units.Point;
  readonly menu: Units.Point;
  readonly button: Units.Px;
};

export type Handheld = {
  readonly device: Units.Region;
  readonly stage: Units.Region;
  readonly pad: Pad;
};

const CASE_PAD = 0.014;
const STAGE_SHARE = 0.7;

const CROSS_SPAN = 0.22;
const CROSS_ARM = 0.083;
const BUTTON_RADIUS = 0.085;
const DEAD_ZONE = 0.2;

const SIDE_FLANK = 0.26;
const SIDE_CROSS = 0.74;
const SIDE_PAUSE = 0.14;
const SIDE_MENU = 0.36;

const CROSS_SIDE = 0.72;
const KEYS_SIDE = 0.23;
const KEYS_HIGH = 0.36;
const KEYS_LOW = 0.7;

const pad = (seat: Units.Point, pause: Units.Point, menu: Units.Point, scale: number): Pad => ({
  seat,
  span: Units.px(scale * CROSS_SPAN),
  arm: Units.px(scale * CROSS_ARM),
  pause,
  menu,
  button: Units.px(scale * BUTTON_RADIUS),
});

const across = (device: Units.Region, share: number, hand: Hand): number =>
  device.left + device.width * (hand === RIGHT_HAND ? share : 1 - share);

export const arrange = (viewport: Units.Viewport, hand: Hand): Handheld => {
  const shortest = Math.min(viewport.width, viewport.height);
  const inset = shortest * CASE_PAD;
  const upright = viewport.height >= viewport.width;

  const device = Units.region({
    left: 0,
    top: 0,
    width: viewport.width,
    height: viewport.height,
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

  const flank = device.width * SIDE_FLANK;
  const middle = across(device, 1 - SIDE_FLANK / 2, hand);

  return {
    device,
    stage: Units.region({
      left: device.left + (hand === LEFT_HAND ? flank : 0) + inset,
      top: device.top + inset,
      width: device.width - flank - inset * 2,
      height: device.height - inset * 2,
    }),
    pad: pad(
      Units.point(middle, device.top + device.height * SIDE_CROSS),
      Units.point(middle, device.top + device.height * SIDE_PAUSE),
      Units.point(middle, device.top + device.height * SIDE_MENU),
      shortest,
    ),
  };
};

export const hit = (of: Pad, at: Units.Point): Option.Type<Control> => {
  if (Math.hypot(at.x - of.pause.x, at.y - of.pause.y) <= of.button) return Option.some(PAUSE);
  if (Math.hypot(at.x - of.menu.x, at.y - of.menu.y) <= of.button) return Option.some(MENU);

  const dx = at.x - of.seat.x;
  const dy = at.y - of.seat.y;

  if (Math.abs(dx) > of.span || Math.abs(dy) > of.span) return Option.none;
  if (Math.hypot(dx, dy) < of.span * DEAD_ZONE) return Option.none;

  if (Math.abs(dx) > Math.abs(dy)) return Option.some(dx > 0 ? Geometry.RIGHT : Geometry.LEFT);

  return Option.some(dy > 0 ? Geometry.DOWN : Geometry.UP);
};

export const armOf = (of: Pad, control: Control): Units.Point => {
  const out = of.span * 0.62;

  switch (control) {
    case Geometry.UP:
      return Units.point(of.seat.x, of.seat.y - out);
    case Geometry.DOWN:
      return Units.point(of.seat.x, of.seat.y + out);
    case Geometry.LEFT:
      return Units.point(of.seat.x - out, of.seat.y);
    case Geometry.RIGHT:
      return Units.point(of.seat.x + out, of.seat.y);
    case PAUSE:
      return of.pause;
    case MENU:
      return of.menu;
    default:
      return Assert.never(control);
  }
};

const facing = (control: Control): Option.Type<Geometry.Direction> => {
  switch (control) {
    case Geometry.UP:
    case Geometry.DOWN:
    case Geometry.LEFT:
    case Geometry.RIGHT:
      return Option.some(control);
    case PAUSE:
    case MENU:
      return Option.none;
    default:
      return Assert.never(control);
  }
};

export const steers = (control: Control): boolean => facing(control).some;

export const keyOf = (control: Control): Option.Type<Input.Key> => {
  const direction = facing(control);

  if (direction.some) return Option.some(Input.turn(0, direction.value));

  return control === PAUSE ? Option.some(Input.pause) : Option.none;
};
