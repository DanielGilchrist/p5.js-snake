import * as Assert from "../../core/assert";
import type * as Palette from "../palette";
import * as Units from "../units";

export type Effect =
  | { readonly kind: "puff"; readonly at: Units.Point; readonly born: Units.Millis }
  | { readonly kind: "dust"; readonly at: Units.Point; readonly born: Units.Millis }
  | { readonly kind: "wisps"; readonly at: Units.Point; readonly born: Units.Millis }
  | { readonly kind: "swallow"; readonly at: Units.Point; readonly born: Units.Millis }
  | {
      readonly kind: "crumbs";
      readonly at: Units.Point;
      readonly colour: Palette.Rgb;
      readonly born: Units.Millis;
    }
  | {
      readonly kind: "ring";
      readonly at: Units.Point;
      readonly colour: Palette.Rgb;
      readonly born: Units.Millis;
    }
  | { readonly kind: "shards"; readonly at: Units.Point; readonly born: Units.Millis }
  | { readonly kind: "dim"; readonly colour: Palette.Rgb; readonly born: Units.Millis }
  | {
      readonly kind: "shake";
      readonly strength: Units.Px;
      readonly span: Units.Millis;
      readonly born: Units.Millis;
    };

const PUFF_MS = 190;
const DUST_MS = 340;
const WISPS_MS = 240;
const SWALLOW_MS = 150;
const CRUMBS_MS = 520;
const RING_MS = 420;
const SHARDS_MS = 560;
const DIM_MS = 560;

export const puff = (at: Units.Point, born: Units.Millis): Effect => ({
  kind: "puff",
  at,
  born,
});

export const dust = (at: Units.Point, born: Units.Millis): Effect => ({
  kind: "dust",
  at,
  born,
});

export const wisps = (at: Units.Point, born: Units.Millis): Effect => ({
  kind: "wisps",
  at,
  born,
});

export const swallow = (at: Units.Point, born: Units.Millis): Effect => ({
  kind: "swallow",
  at,
  born,
});

export const crumbs = (at: Units.Point, colour: Palette.Rgb, born: Units.Millis): Effect => ({
  kind: "crumbs",
  at,
  colour,
  born,
});

export const ring = (at: Units.Point, colour: Palette.Rgb, born: Units.Millis): Effect => ({
  kind: "ring",
  at,
  colour,
  born,
});

export const shards = (at: Units.Point, born: Units.Millis): Effect => ({
  kind: "shards",
  at,
  born,
});

export const dim = (colour: Palette.Rgb, born: Units.Millis): Effect => ({
  kind: "dim",
  colour,
  born,
});

type Tremor = { readonly strength: Units.Px; readonly span: Units.Millis };

const tremor = (strength: number, span: number): Tremor => ({
  strength: Units.px(strength),
  span: Units.millis(span),
});

const PUNCH = tremor(8, 210);
const QUAKE = tremor(13, 430);

const shakeOf = (of: Tremor, born: Units.Millis): Effect => ({
  kind: "shake",
  strength: of.strength,
  span: of.span,
  born,
});

export const punch = (born: Units.Millis): Effect => shakeOf(PUNCH, born);

export const quake = (born: Units.Millis): Effect => shakeOf(QUAKE, born);

const lifespan = (effect: Effect): number => {
  switch (effect.kind) {
    case "puff":
      return PUFF_MS;
    case "dust":
      return DUST_MS;
    case "wisps":
      return WISPS_MS;
    case "swallow":
      return SWALLOW_MS;
    case "crumbs":
      return CRUMBS_MS;
    case "ring":
      return RING_MS;
    case "shards":
      return SHARDS_MS;
    case "dim":
      return DIM_MS;
    case "shake":
      return effect.span;
    default:
      return Assert.never(effect);
  }
};

export const progress = (effect: Effect, now: Units.Millis): number =>
  Math.min(1, Math.max(0, (now - effect.born) / lifespan(effect)));

export const alive = (effects: readonly Effect[], now: Units.Millis): readonly Effect[] =>
  effects.filter((effect) => progress(effect, now) < 1);

const TREMOR_X_RATE = 0.09;
const TREMOR_Y_RATE = 0.13;

export const shakeOffset = (effects: readonly Effect[], now: Units.Millis): Units.Offset => {
  let dx = 0;
  let dy = 0;

  for (const effect of effects) {
    if (effect.kind !== "shake") continue;

    const remaining = (1 - progress(effect, now)) ** 2 * effect.strength;

    dx += Math.sin(now * TREMOR_X_RATE) * remaining;
    dy += Math.cos(now * TREMOR_Y_RATE) * remaining;
  }

  return Units.offset(dx, dy);
};
