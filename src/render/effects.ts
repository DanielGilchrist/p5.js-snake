import type p5 from "p5";

import * as Assert from "../core/assert";
import type * as Game from "../core/game";
import * as Layout from "./layout";
import * as Palette from "./palette";
import * as Units from "./units";

export type Effect =
  | {
      readonly kind: "ring";
      readonly at: Units.Point;
      readonly colour: Palette.Rgb;
      readonly born: Units.Millis;
    }
  | { readonly kind: "shards"; readonly at: Units.Point; readonly born: Units.Millis }
  | { readonly kind: "bloom"; readonly at: Units.Point; readonly born: Units.Millis }
  | { readonly kind: "shake"; readonly born: Units.Millis }
  | { readonly kind: "flash"; readonly colour: Palette.Rgb; readonly born: Units.Millis };

const RING_MS = 420;
const SHARDS_MS = 560;
const BLOOM_MS = 300;
const SHAKE_MS = 420;
const FLASH_MS = 560;

const SHARD_COUNT = 14;
const SHAKE_PIXELS = 12;

const lifespan = (effect: Effect): number => {
  switch (effect.kind) {
    case "ring":
      return RING_MS;
    case "shards":
      return SHARDS_MS;
    case "bloom":
      return BLOOM_MS;
    case "shake":
      return SHAKE_MS;
    case "flash":
      return FLASH_MS;
    default:
      return Assert.never(effect);
  }
};

const progress = (effect: Effect, now: Units.Millis): number =>
  Math.min(1, Math.max(0, (now - effect.born) / lifespan(effect)));

const easeOut = (t: number): number => 1 - (1 - t) ** 3;

export const spawn = <B>(
  event: Game.Event<B>,
  layout: Layout.Metrics,
  now: Units.Millis,
): readonly Effect[] => {
  const at = Layout.centreOf(layout, event.at);

  switch (event.kind) {
    case "ate":
      return [
        { kind: "bloom", at, born: now },
        { kind: "ring", at, colour: Palette.PAPER, born: now },
      ];
    case "died":
      return [
        { kind: "shake", born: now },
        { kind: "flash", colour: Palette.FOOD, born: now },
        { kind: "ring", at, colour: Palette.FOOD, born: now },
        { kind: "shards", at, born: now },
      ];
    default:
      return Assert.never(event);
  }
};

export const alive = (effects: readonly Effect[], now: Units.Millis): readonly Effect[] =>
  effects.filter((effect) => progress(effect, now) < 1);

export const shakeOffset = (effects: readonly Effect[], now: Units.Millis): Units.Offset => {
  const shake = effects.find((effect) => effect.kind === "shake");

  if (shake === undefined) return { dx: Units.px(0), dy: Units.px(0) };

  const remaining = (1 - progress(shake, now)) ** 2;

  return {
    dx: Units.px(Math.sin(now * 0.06) * SHAKE_PIXELS * remaining),
    dy: Units.px(Math.cos(now * 0.09) * SHAKE_PIXELS * remaining),
  };
};

const drawRing = (
  p: p5,
  at: Units.Point,
  colour: Palette.Rgb,
  t: number,
  block: Units.Px,
): void => {
  const eased = easeOut(t);
  const fade = (1 - t) ** 2 * 220;

  p.noFill();
  p.stroke(colour.red, colour.green, colour.blue, fade);
  p.strokeWeight(3 * (1 - t) + 0.4);
  p.circle(at.x, at.y, eased * block * 2.8);
};

const drawShards = (p: p5, at: Units.Point, t: number, block: Units.Px): void => {
  const eased = easeOut(t);
  const fade = (1 - t) ** 2 * 255;

  p.noStroke();

  for (let i = 0; i < SHARD_COUNT; i++) {
    const angle = (i / SHARD_COUNT) * Math.PI * 2 + i * 0.3;
    const drift = eased * block * (1.1 + (i % 3) * 0.28);
    const gravity = eased * eased * block * 0.55;
    const size = (1 - t) * block * 0.22;

    p.fill(Palette.FOOD.red, Palette.FOOD.green - i * 3, Palette.FOOD.blue, fade);
    p.push();
    p.translate(at.x + Math.cos(angle) * drift, at.y + Math.sin(angle) * drift + gravity);
    p.rotate(t * 6 + i);
    p.rect(-size / 2, -size / 2, size, size, size * 0.3);
    p.pop();
  }
};

const drawBloom = (p: p5, at: Units.Point, t: number, block: Units.Px): void => {
  const eased = easeOut(t);
  const fade = (1 - t) ** 2;

  p.noStroke();
  p.fill(Palette.PAPER.red, Palette.PAPER.green, Palette.PAPER.blue, fade * 210);
  p.circle(at.x, at.y, block * (0.7 + eased * 1.0) * (1 - t * 0.6));
};

const drawFlash = (p: p5, colour: Palette.Rgb, t: number): void => {
  const fade = (1 - t) ** 2 * 140;

  p.push();
  p.noStroke();
  p.fill(colour.red, colour.green, colour.blue, fade);
  p.rect(0, 0, p.width, p.height);
  p.pop();
};

export const draw = (
  p: p5,
  effects: readonly Effect[],
  layout: Layout.Metrics,
  now: Units.Millis,
): void => {
  for (const effect of effects) {
    const t = progress(effect, now);

    switch (effect.kind) {
      case "ring":
        drawRing(p, effect.at, effect.colour, t, layout.blockWidth);
        break;
      case "shards":
        drawShards(p, effect.at, t, layout.blockWidth);
        break;
      case "bloom":
        drawBloom(p, effect.at, t, layout.blockWidth);
        break;
      case "flash":
        drawFlash(p, effect.colour, t);
        break;
      case "shake":
        break;
      default:
        Assert.never(effect);
    }
  }
};
