import type p5 from "p5";

import * as Ease from "../ease";
import * as Paint from "../paint";
import * as Palette from "../palette";
import type * as Units from "../units";

const SIZE_RATIO = 0.8;
const CORNER_RATIO = 0.2;
const SPIN = Math.PI * 1.2;
const VANISH_AT = 0.5;

export const draw = (p: p5, at: Units.Point, t: number, block: Units.Px): void => {
  const consumed = Ease.inQuad(t);
  const size = block * SIZE_RATIO * (1 - consumed);

  if (size <= VANISH_AT) return;

  p.push();
  p.translate(at.x, at.y);
  p.rotate(consumed * SPIN);
  p.noStroke();
  Paint.fillWith(p, Palette.FOOD, Paint.alpha(255 * (1 - consumed)));
  p.rect(-size / 2, -size / 2, size, size, size * CORNER_RATIO);
  p.pop();
};
