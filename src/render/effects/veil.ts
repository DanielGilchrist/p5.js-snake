import type p5 from "p5";

import * as Ease from "../ease";
import * as Paint from "../paint";
import type * as Palette from "../palette";

const DIM_PEAK = 95;

export const dim = (p: p5, colour: Palette.Rgb, t: number): void => {
  p.push();
  p.noStroke();
  Paint.fillWith(p, colour, Paint.alpha(Ease.fadeOut(t, 2) * DIM_PEAK));
  p.rect(0, 0, p.width, p.height);
  p.pop();
};
