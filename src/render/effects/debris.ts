import type p5 from "p5";

import * as Ease from "../ease";
import * as Paint from "../paint";
import type * as Palette from "../palette";
import * as Sculpt from "../sculpt";
import type * as Units from "../units";
import type * as Effect from "./effect";

const TURN = Math.PI * 2;
const HOPS = 5;
const RESTING = 0.35;
const SQUASH = 0.55;
const SHADOW_ALPHA = 0.12;
const SHADOW_REACH = 0.5;

type Toss = {
  readonly count: number;
  readonly throwOut: number;
  readonly lift: number;
  readonly gravity: number;
  readonly bounce: number;
  readonly drag: number;
  readonly size: number;
  readonly spin: number;
  readonly fade: number;
  readonly spread: number;
  readonly variance: number;
};

type Landing = {
  readonly out: number;
  readonly up: number;
  readonly settled: number;
};

const arcOf = (of: Toss, out: number, lift: number, seconds: number): Landing => {
  let left = seconds;
  let along = 0;
  let rising = lift;
  let sideways = out;

  for (let hop = 0; hop < HOPS; hop++) {
    const flight = (2 * rising) / of.gravity;

    if (left < flight) {
      const up = Math.max(0, rising * left - (of.gravity * left * left) / 2);

      return {
        out: along + sideways * left,
        up,
        settled: 1 - Math.min(1, up / Math.max(0.001, lift * 0.35)),
      };
    }

    left -= flight;
    along += sideways * flight;
    rising *= of.bounce;
    sideways *= of.drag;

    if (rising < RESTING) break;
  }

  return { out: along + sideways * left * 0.2, up: 0, settled: 1 };
};

const grit = (
  p: p5,
  scheme: Palette.Scheme,
  at: Units.Point,
  t: number,
  block: Units.Px,
  of: Toss,
  colour: Palette.Rgb,
  flow: Effect.Flow,
  seconds: number,
): void => {
  const when = flow === "inward" ? 1 - t : t;
  const fade = Ease.fadeOut(t, of.fade) * 255;

  p.noStroke();

  for (let i = 0; i < of.count; i++) {
    const angle = (i / of.count) * TURN + (Sculpt.hash(i + 1, 7) - 0.5) * 0.9;
    const landing = arcOf(
      of,
      of.throwOut * (0.45 + Sculpt.hash(i + 1, 3) * 1.1),
      of.lift * (0.7 + Sculpt.hash(i + 1, 11) * 0.6),
      when * seconds,
    );
    const size = block * of.size * (of.spread + Sculpt.hash(i + 1, 13) * of.variance);
    const ground = at.y + Math.sin(angle) * landing.out * block * SQUASH;
    const x = at.x + Math.cos(angle) * landing.out * block;

    const cast = Math.min(1, landing.out / SHADOW_REACH);

    Paint.fillWith(p, scheme.shadow, Paint.alpha(fade * SHADOW_ALPHA * landing.settled * cast));
    p.ellipse(x, ground + size * 0.42, size * 1.4, size * 0.42);

    Paint.fillWith(p, colour, Paint.alpha(fade));
    p.push();
    p.translate(x, ground - landing.up * block);
    p.rotate(when * of.spin + i);
    p.rect(-size / 2, -size / 2, size, size, size * 0.32);
    p.pop();
  }
};

const SHARDS: Toss = {
  count: 30,
  throwOut: 6.2,
  lift: 4.4,
  gravity: 58,
  bounce: 0.12,
  drag: 0.82,
  size: 0.2,
  spin: 4,
  fade: 1.1,
  spread: 0.3,
  variance: 1.5,
};

const CRUMBS: Toss = {
  count: 18,
  throwOut: 3.4,
  lift: 9.2,
  gravity: 66,
  bounce: 0.48,
  drag: 0.7,
  size: 0.19,
  spin: 11,
  fade: 1.4,
  spread: 0.72,
  variance: 0.5,
};

export const shards = (
  p: p5,
  scheme: Palette.Scheme,
  at: Units.Point,
  t: number,
  block: Units.Px,
  colour: Palette.Rgb,
  seconds: number,
): void => grit(p, scheme, at, t, block, SHARDS, colour, "outward", seconds);

export const crumbs = (
  p: p5,
  scheme: Palette.Scheme,
  at: Units.Point,
  t: number,
  block: Units.Px,
  colour: Palette.Rgb,
  flow: Effect.Flow,
  seconds: number,
): void => grit(p, scheme, at, t, block, CRUMBS, colour, flow, seconds);
