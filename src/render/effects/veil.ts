import type p5 from "p5";

import * as Ease from "../ease";
import * as Paint from "../paint";
import * as Palette from "../palette";
import type * as Units from "../units";

const RING_SPREAD = 2.6;
const RING_WEIGHT = 6;
const RING_ALPHA = 170;
const DIM_PEAK = 95;

export const ring = (
  p: p5,
  at: Units.Point,
  colour: Palette.Rgb,
  t: number,
  block: Units.Px,
): void => {
  p.noFill();
  Paint.strokeWith(p, colour, Paint.alpha(Ease.fadeOut(t, 1.9) * RING_ALPHA));
  p.strokeWeight(Math.max(0.5, RING_WEIGHT * Ease.fadeOut(t, 1.3)));
  p.circle(at.x, at.y, Ease.outCubic(t) * block * RING_SPREAD);
};

export const dim = (p: p5, colour: Palette.Rgb, t: number): void => {
  p.push();
  p.noStroke();
  Paint.fillWith(p, colour, Paint.alpha(Ease.fadeOut(t, 2) * DIM_PEAK));
  p.rect(0, 0, p.width, p.height);
  p.pop();
};
