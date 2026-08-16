import * as Assert from "../../core/assert";
import type * as Palette from "../palette";
import * as Units from "../units";

export type Flow = "inward" | "outward";

export const SWALLOW = "swallow";
export const CRUMBS = "crumbs";
export const SHARDS = "shards";
export const SCUFF = "scuff";
export const DIM = "dim";
export const SHAKE = "shake";

export type Effect =
  | {
      readonly kind: typeof SWALLOW;
      readonly at: Units.Point;
      readonly colour: Palette.Rgb;
      readonly flow: Flow;
      readonly born: Units.Millis;
    }
  | {
      readonly kind: typeof CRUMBS;
      readonly at: Units.Point;
      readonly colour: Palette.Rgb;
      readonly flow: Flow;
      readonly born: Units.Millis;
    }
  | {
      readonly kind: typeof SHARDS;
      readonly at: Units.Point;
      readonly colour: Palette.Rgb;
      readonly born: Units.Millis;
    }
  | {
      readonly kind: typeof SCUFF;
      readonly at: Units.Point;
      readonly colour: Palette.Rgb;
      readonly born: Units.Millis;
    }
  | { readonly kind: typeof DIM; readonly colour: Palette.Rgb; readonly born: Units.Millis }
  | {
      readonly kind: typeof SHAKE;
      readonly strength: Units.Px;
      readonly span: Units.Millis;
      readonly born: Units.Millis;
    };

const SWALLOW_MS = 95;
const CRUMBS_MS = 520;
const SHARDS_MS = 820;
const SCUFF_MS = 900;
const DIM_MS = 560;

export const swallow = (
  at: Units.Point,
  colour: Palette.Rgb,
  flow: Flow,
  born: Units.Millis,
): Effect => ({ kind: SWALLOW, at, colour, flow, born });

export const crumbs = (
  at: Units.Point,
  colour: Palette.Rgb,
  flow: Flow,
  born: Units.Millis,
): Effect => ({ kind: CRUMBS, at, colour, flow, born });

export const shards = (at: Units.Point, colour: Palette.Rgb, born: Units.Millis): Effect => ({
  kind: SHARDS,
  at,
  colour,
  born,
});

export const scuff = (at: Units.Point, colour: Palette.Rgb, born: Units.Millis): Effect => ({
  kind: SCUFF,
  at,
  colour,
  born,
});

export const dim = (colour: Palette.Rgb, born: Units.Millis): Effect => ({
  kind: DIM,
  colour,
  born,
});

type Tremor = { readonly strength: Units.Px; readonly span: Units.Millis };

const tremor = (strength: number, span: number): Tremor => ({
  strength: Units.px(strength),
  span: Units.millis(span),
});

const PUNCH = tremor(9, 215);
const QUAKE = tremor(17, 450);

const shakeOf = (of: Tremor, born: Units.Millis): Effect => ({
  kind: SHAKE,
  strength: of.strength,
  span: of.span,
  born,
});

export const punch = (born: Units.Millis): Effect => shakeOf(PUNCH, born);

export const quake = (born: Units.Millis): Effect => shakeOf(QUAKE, born);

export const spanOf = (effect: Effect): number => {
  switch (effect.kind) {
    case SWALLOW:
      return SWALLOW_MS;
    case CRUMBS:
      return CRUMBS_MS;
    case SHARDS:
      return SHARDS_MS;
    case SCUFF:
      return SCUFF_MS;
    case DIM:
      return DIM_MS;
    case SHAKE:
      return effect.span;
    default:
      return Assert.never(effect);
  }
};

export const progress = (effect: Effect, now: Units.Millis): number =>
  Math.min(1, Math.max(0, (now - effect.born) / spanOf(effect)));

export const alive = (effects: readonly Effect[], now: Units.Millis): readonly Effect[] =>
  effects.filter((effect) => progress(effect, now) < 1);

const TREMOR_X_RATE = 0.09;
const TREMOR_Y_RATE = 0.13;

export const shakeOffset = (effects: readonly Effect[], now: Units.Millis): Units.Offset => {
  let dx = 0;
  let dy = 0;

  for (const effect of effects) {
    if (effect.kind !== SHAKE) continue;

    const remaining = (1 - progress(effect, now)) ** 2 * effect.strength;

    dx += Math.sin(now * TREMOR_X_RATE) * remaining;
    dy += Math.cos(now * TREMOR_Y_RATE) * remaining;
  }

  return Units.offset(dx, dy);
};
