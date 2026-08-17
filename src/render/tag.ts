import type p5 from "p5";

import type * as Option from "../core/option";
import * as Paint from "./paint";
import type * as Palette from "./palette";
import type * as Units from "./units";

export type Tag = {
  readonly name: Option.Type<string>;
  readonly mine: boolean;
  readonly above: boolean;
};

const RISE = 1.15;
const TEXT = 0.34;
const PAD = 0.42;
const HEIGHT = 0.78;
const RADIUS = 0.3;
const STEM = 0.16;
const DROP = 0.09;
const EDGE = 0.07;

const RING_WIDTH = 0.1;
const RING_SPREAD = 1.35;
const RING_BREATH = 0.06;
const RING_ALPHA = 132;

const lit = (colour: Palette.Rgb): number =>
  (0.2126 * colour.red + 0.7152 * colour.green + 0.0722 * colour.blue) / 255;

const against = (ground: Palette.Rgb, one: Palette.Rgb, other: Palette.Rgb): Palette.Rgb =>
  Math.abs(lit(ground) - lit(one)) >= Math.abs(lit(ground) - lit(other)) ? one : other;
const SHADOW = Paint.alpha(60);

export const ring = (
  p: p5,
  scheme: Palette.Scheme,
  at: Units.Point,
  block: Units.Px,
  body: Palette.Body,
  beat: number,
): void => {
  const swell = 1 + Math.sin(beat) * RING_BREATH;
  const across = block * RING_SPREAD * swell;

  p.push();
  p.noFill();
  Paint.strokeWith(p, against(scheme.floor, body.deep, body.skin), Paint.alpha(RING_ALPHA));
  p.strokeWeight(block * RING_WIDTH);
  p.circle(at.x, at.y, across);
  p.pop();
};

export const draw = (
  p: p5,
  scheme: Palette.Scheme,
  at: Units.Point,
  block: Units.Px,
  body: Palette.Body,
  tag: Tag,
): void => {
  if (!tag.name.some) return;

  const text = tag.name.value;
  const size = block * TEXT;
  const height = block * HEIGHT;
  const way = tag.above ? -1 : 1;
  const seat = at.y + block * RISE * way;

  p.push();
  p.textSize(size);
  p.textAlign(p.CENTER, p.CENTER);

  const width = p.textWidth(text) + block * PAD * 2;
  const left = at.x - width / 2;
  const top = seat - height / 2;

  p.noStroke();

  Paint.fillWith(p, scheme.shadow, SHADOW);
  p.rect(left, top + block * DROP, width, height, block * RADIUS);

  Paint.fill(p, body.skin);
  p.rect(
    left - block * EDGE,
    top - block * EDGE,
    width + block * EDGE * 2,
    height + block * EDGE * 2,
    block * RADIUS,
  );

  Paint.fill(p, scheme.paper);
  p.rect(left, top, width, height, block * RADIUS);

  const foot = tag.above ? top + height : top;

  Paint.fill(p, body.skin);
  p.triangle(
    at.x - block * STEM,
    foot,
    at.x + block * STEM,
    foot,
    at.x,
    foot - block * STEM * 1.6 * way,
  );

  p.textStyle(p.BOLD);
  Paint.fill(p, against(scheme.paper, scheme.text, scheme.background));
  p.text(text, at.x, seat);
  p.pop();
};
