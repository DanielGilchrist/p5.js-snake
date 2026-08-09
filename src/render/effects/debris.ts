import type p5 from "p5";

import * as Ease from "../ease";
import * as Paint from "../paint";
import * as Palette from "../palette";
import type * as Units from "./../units";

const TURN = Math.PI * 2;

const SHARD_COUNT = 14;
const SHARD_DRIFT = 1.1;
const SHARD_GRAVITY = 0.55;
const SHARD_SIZE = 0.22;

const CRUMB_COUNT = 10;
const CRUMB_DRIFT = 1.6;
const CRUMB_GRAVITY = 0;
const CRUMB_SIZE = 0.17;

type Flow = "outward" | "inward";

type Grit = {
  readonly count: number;
  readonly drift: number;
  readonly gravity: number;
  readonly size: number;
  readonly spin: number;
  readonly scatter: number;
  readonly flow: Flow;
  readonly fade: number;
};

const shade = (colour: Palette.Rgb, i: number): Palette.Rgb =>
  Palette.rgb(colour.red, colour.green - i * 3, colour.blue);

const grit = (
  p: p5,
  at: Units.Point,
  t: number,
  block: Units.Px,
  of: Grit,
  colour: Palette.Rgb,
): void => {
  const eased = Ease.outQuint(t);
  const reach = of.flow === "inward" ? 1 - eased : eased;
  const fade = Ease.fadeOut(t, of.fade) * 255;

  p.noStroke();

  for (let i = 0; i < of.count; i++) {
    const angle = (i / of.count) * TURN + i * of.scatter;
    const distance = reach * block * (of.drift + (i % 3) * 0.28);
    const drop = eased * eased * block * of.gravity;
    const size = (1 - t) * block * of.size;

    Paint.fillWith(p, shade(colour, i), Paint.alpha(fade));
    p.push();
    p.translate(at.x + Math.cos(angle) * distance, at.y + Math.sin(angle) * distance + drop);
    p.rotate(t * of.spin + i);
    p.rect(-size / 2, -size / 2, size, size, size * 0.3);
    p.pop();
  }
};

const SHARDS: Grit = {
  count: SHARD_COUNT,
  drift: SHARD_DRIFT,
  gravity: SHARD_GRAVITY,
  size: SHARD_SIZE,
  spin: 6,
  scatter: 0.3,
  flow: "outward",
  fade: 2,
};

const CRUMBS: Grit = {
  count: CRUMB_COUNT,
  drift: CRUMB_DRIFT,
  gravity: CRUMB_GRAVITY,
  size: CRUMB_SIZE,
  spin: 7,
  scatter: 0.7,
  flow: "inward",
  fade: 1.1,
};

export const shards = (p: p5, at: Units.Point, t: number, block: Units.Px): void =>
  grit(p, at, t, block, SHARDS, Palette.FOOD_DEEP);

export const crumbs = (
  p: p5,
  at: Units.Point,
  t: number,
  block: Units.Px,
  colour: Palette.Rgb,
): void => grit(p, at, t, block, CRUMBS, colour);
