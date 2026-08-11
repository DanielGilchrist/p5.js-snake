import type p5 from "p5";

import * as NonEmpty from "../core/non-empty";
import * as Assert from "../core/assert";
import type * as Board from "../core/board";
import type * as World from "../core/world";
import * as Paint from "./paint";
import type * as Palette from "./palette";
import * as Sculpt from "./sculpt";
import type * as Units from "./units";

export type Topper = "sprig" | "stalk" | "tuft" | "bare";

export type Form = "apple" | "pear" | "berries" | "root";

export type Hue = "terracotta" | "ochre" | "plum" | "brick";

const skinOf = (scheme: Palette.Scheme, hue: Hue): Palette.Rgb => {
  switch (hue) {
    case "terracotta":
      return scheme.food;
    case "ochre":
      return scheme.ochre;
    case "plum":
      return scheme.plum;
    case "brick":
      return scheme.berry;
    default:
      return Assert.never(hue);
  }
};

const fleshOf = (scheme: Palette.Scheme, hue: Hue): Palette.Rgb => {
  switch (hue) {
    case "terracotta":
      return scheme.foodDeep;
    case "ochre":
      return scheme.ochreDeep;
    case "plum":
      return scheme.plumDeep;
    case "brick":
      return scheme.berryDeep;
    default:
      return Assert.never(hue);
  }
};

export type Morsel = {
  readonly form: Form;
  readonly hue: Hue;
  readonly width: number;
  readonly height: number;
  readonly lobes: number;
  readonly roughness: number;
  readonly pinch: number;
  readonly topper: Topper;
};

const morsel = (fields: Morsel): Morsel => ({ ...fields });

const APPLE = morsel({
  form: "apple",
  hue: "terracotta",
  width: 0.7,
  height: 0.64,
  lobes: 11,
  roughness: 0.11,
  pinch: 0.07,
  topper: "sprig",
});

const PEAR = morsel({
  form: "pear",
  hue: "ochre",
  width: 0.58,
  height: 0.72,
  lobes: 12,
  roughness: 0.09,
  pinch: 0.26,
  topper: "stalk",
});

const BERRIES = morsel({
  form: "berries",
  hue: "plum",
  width: 0.66,
  height: 0.58,
  lobes: 9,
  roughness: 0.14,
  pinch: 0,
  topper: "bare",
});

const ROOT = morsel({
  form: "root",
  hue: "brick",
  width: 0.62,
  height: 0.66,
  lobes: 10,
  roughness: 0.12,
  pinch: -0.24,
  topper: "tuft",
});

const CROP = [APPLE, PEAR, BERRIES, ROOT] as const;

export const at = <B>(cell: Board.Cell<B>): Morsel => {
  const pick = Math.abs(cell.col * 7 + cell.row * 13) % CROP.length;

  return CROP[pick] ?? APPLE;
};

export const seedAt = <B>(cell: Board.Cell<B>): number =>
  Math.abs(Sculpt.hash(cell.col * 3.7 + 1, cell.row * 2.3 + 1)) * 97 + 3;

export const skinAt = <B>(scheme: Palette.Scheme, cell: Board.Cell<B>): Palette.Rgb =>
  skinOf(scheme, at(cell).hue);

const CREST_RATIO = 0.8;
const CREST_LIFT = 0.09;

const DIMPLE_RATIO = 0.3;
const DIMPLE_ALPHA = 52;

const STALK_HEIGHT = 0.34;
const STALK_THICKNESS = 0.05;
const LEAF_LENGTH = 0.38;
const LEAF_WIDTH = 0.15;
const TUFT_BLADES = 3;

const BERRY_SPREAD = 0.3;

const topper = (
  p: p5,
  scheme: Palette.Scheme,
  kind: Topper,
  width: number,
  height: number,
): void => {
  const crest = -height / 2;

  switch (kind) {
    case "bare":
      return;

    case "stalk": {
      Paint.fill(p, scheme.stem);
      p.push();
      p.translate(0, crest + height * 0.06);
      Sculpt.stalk(p, 0, height * STALK_HEIGHT, width * STALK_THICKNESS);
      p.pop();

      return;
    }

    case "sprig": {
      Paint.fill(p, scheme.stem);
      p.push();
      p.translate(0, crest + height * 0.08);
      Sculpt.stalk(p, 0, height * STALK_HEIGHT * 0.8, width * STALK_THICKNESS);
      p.pop();

      Paint.fill(p, scheme.leaf);
      p.push();
      p.translate(width * 0.06, crest - height * STALK_HEIGHT * 0.5);
      p.rotate(-0.42);
      Sculpt.leaf(p, width * LEAF_LENGTH, width * LEAF_WIDTH);
      p.pop();

      return;
    }

    case "tuft": {
      Paint.fill(p, scheme.leaf);

      for (let i = 0; i < TUFT_BLADES; i++) {
        const lean = (i / (TUFT_BLADES - 1) - 0.5) * 1.5;

        p.push();
        p.translate(0, crest + height * 0.06);
        p.rotate(lean - Math.PI / 2);
        Sculpt.leaf(p, height * 0.44, width * 0.11);
        p.pop();
      }

      return;
    }

    default:
      return Assert.never(kind);
  }
};

const body = (
  p: p5,
  scheme: Palette.Scheme,
  crop: Morsel,
  seed: number,
  width: number,
  height: number,
): void => {
  const shape = (radiusX: number, radiusY: number, grain: number): Sculpt.Lump =>
    Sculpt.lump({
      radiusX,
      radiusY,
      lobes: crop.lobes,
      roughness: crop.roughness,
      pinch: crop.pinch,
      seed: seed + grain,
    });

  switch (crop.form) {
    case "berries": {
      const pip = width * 0.34;

      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;

        p.push();
        p.translate(
          Math.cos(angle) * width * BERRY_SPREAD,
          Math.sin(angle) * height * BERRY_SPREAD,
        );
        Paint.fill(p, fleshOf(scheme, crop.hue));
        Sculpt.press(p, shape(pip, pip, i * 5));
        Paint.fill(p, skinOf(scheme, crop.hue));
        p.push();
        p.translate(0, -pip * CREST_LIFT);
        Sculpt.press(p, shape(pip * CREST_RATIO, pip * CREST_RATIO, i * 5));
        p.pop();
        p.pop();
      }

      return;
    }

    case "apple":
    case "pear":
    case "root": {
      Paint.fill(p, fleshOf(scheme, crop.hue));
      Sculpt.press(p, shape(width / 2, height / 2, 0));

      Paint.fill(p, skinOf(scheme, crop.hue));
      p.push();
      p.translate(0, -height * CREST_LIFT);
      Sculpt.press(p, shape((width / 2) * CREST_RATIO, (height / 2) * CREST_RATIO, 0));
      p.pop();

      Paint.fillWith(p, fleshOf(scheme, crop.hue), Paint.alpha(DIMPLE_ALPHA));
      p.push();
      p.translate(-width * 0.14, height * 0.06);
      p.rotate(0.5);
      p.ellipse(0, 0, width * DIMPLE_RATIO, width * DIMPLE_RATIO * 0.62);
      p.pop();

      return;
    }

    default:
      return Assert.never(crop.form);
  }
};

export const draw = (
  p: p5,
  scheme: Palette.Scheme,
  crop: Morsel,
  seed: number,
  width: number,
  height: number,
): void => {
  topper(p, scheme, crop.topper, width, height);
  body(p, scheme, crop, seed, width, height);
};

const STOP_MOTION_FPS = 12;

const TENSION_RANGE = 6;

const CALM_BREATH_RATE = 0.0026;
const EAGER_BREATH_RATE = 0.011;
const CALM_BREATH_DEPTH = 0.02;
const EAGER_BREATH_DEPTH = 0.06;
const EAGER_LEAN = 0.09;

export type Stir = {
  readonly breath: number;
  readonly lean: number;
  readonly tension: number;
};

const mix = (from: number, to: number, t: number): number => from + (to - from) * t;

const framed = (now: Units.Millis): number =>
  Math.floor((now * STOP_MOTION_FPS) / 1000) * (1000 / STOP_MOTION_FPS);

export const stir = <B>(world: World.Type<B>, now: Units.Millis): Stir => {
  const distance = Math.hypot(
    world.food.col - NonEmpty.head(world.players).snake.head.col,
    world.food.row - NonEmpty.head(world.players).snake.head.row,
  );
  const tension = Math.min(1, Math.max(0, 1 - distance / TENSION_RANGE));
  const beat = Math.sin(framed(now) * mix(CALM_BREATH_RATE, EAGER_BREATH_RATE, tension));

  return {
    breath: 1 + beat * mix(CALM_BREATH_DEPTH, EAGER_BREATH_DEPTH, tension),
    lean: beat * EAGER_LEAN * tension,
    tension,
  };
};
