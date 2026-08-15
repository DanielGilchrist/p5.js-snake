import type p5 from "p5";

import * as Paint from "./paint";
import type * as Palette from "./palette";
import type * as Layout from "./layout";
import type * as Units from "./units";

export type Countdown = { readonly left: Units.Millis; readonly span: Units.Millis };

export const countdown = (left: Units.Millis, span: Units.Millis): Countdown => ({ left, span });

const STEP = 1000;
const GO = "GO";
const SIZE = 3.4;
const SWELL = 0.18;
const FADE = 150;

export const wordFor = (left: Units.Millis): string => {
  const beats = Math.ceil(left / STEP);

  return beats <= 0 ? GO : String(beats);
};

const growth = (left: Units.Millis): number => {
  const into = (STEP - (left % STEP)) / STEP;

  return 1 + SWELL * (1 - into);
};

export const draw = (
  p: p5,
  scheme: Palette.Scheme,
  layout: Layout.Metrics,
  stage: Units.Region,
  count: Countdown,
): void => {
  const word = wordFor(count.left);
  const showing = Math.min(1, count.left / FADE);

  p.push();
  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(layout.blockWidth * SIZE * growth(count.left));
  p.noStroke();

  const x = stage.left + stage.width / 2;
  const y = stage.top + stage.height / 2;

  Paint.fillWith(p, scheme.shadow, Paint.alpha(90 * showing));
  p.text(word, x, y + layout.blockWidth * 0.09);

  Paint.fillWith(p, scheme.text, Paint.alpha(255 * showing));
  p.text(word, x, y);
  p.pop();
};
