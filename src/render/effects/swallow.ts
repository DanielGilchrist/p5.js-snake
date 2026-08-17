import type p5 from "p5";

import * as Ease from "../ease";
import * as Paint from "../paint";
import type * as Palette from "../palette";
import type * as Units from "../units";
import type * as Effect from "./effect";

const SIZE_RATIO = 0.8;
const CORNER_RATIO = 0.2;
const SPIN = Math.PI * 0.5;
const SPREAD = 0.85;
const VANISH_AT = 0.5;

export const draw = (
  p: p5,
  at: Units.Point,
  colour: Palette.Rgb,
  flow: Effect.Flow,
  t: number,
  block: Units.Px,
): void => {
  const crushed = Ease.inQuad(flow === "inward" ? 1 - t : t);
  const height = block * SIZE_RATIO * (1 - crushed);
  const width = block * SIZE_RATIO * (1 + crushed * SPREAD) * (1 - crushed * 0.5);

  if (height <= VANISH_AT) return;

  p.push();
  p.translate(at.x, at.y);
  p.rotate(crushed * SPIN);
  p.noStroke();
  Paint.fillWith(p, colour, Paint.alpha(255 * (1 - crushed)));
  p.rect(-width / 2, -height / 2, width, height, height * CORNER_RATIO);
  p.pop();
};
