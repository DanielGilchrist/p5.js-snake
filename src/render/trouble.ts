import type p5 from "p5";

import * as Paint from "./paint";
import type * as Palette from "./palette";
import * as Scene from "./scene";

const TITLE = 0.06;
const REASON = 0.034;
const DETAIL = 0.026;

const TITLE_Y = 0.34;
const REASON_Y = 0.46;
const DETAIL_Y = 0.53;
const WAY_OUT_Y = 0.64;

const DETAIL_ALPHA = 130;

export type Trouble = {
  readonly title: string;
  readonly reason: string;
  readonly detail: string;
};

export const trouble = (title: string, reason: string, detail: string): Trouble => ({
  title,
  reason,
  detail,
});

const wayOutFor = (prompt: Scene.Prompt): string =>
  prompt === Scene.TOUCH ? "Tap to play on your own" : "Press any key to play on your own";

const centred = (p: p5, text: string, size: number, y: number): void => {
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(size);
  p.text(text, p.width / 2, p.height * y);
};

export const draw = (p: p5, scheme: Palette.Scheme, told: Trouble, prompt: Scene.Prompt): void => {
  const short = Math.min(p.width, p.height);

  p.background(scheme.background.red, scheme.background.green, scheme.background.blue);
  p.noStroke();

  Paint.fill(p, scheme.blood);
  centred(p, told.title, short * TITLE, TITLE_Y);

  Paint.fill(p, scheme.text);
  centred(p, told.reason, short * REASON, REASON_Y);

  Paint.fillWith(p, scheme.text, Paint.alpha(DETAIL_ALPHA));
  centred(p, told.detail, short * DETAIL, DETAIL_Y);

  Paint.fill(p, scheme.text);
  centred(p, wayOutFor(prompt), short * REASON, WAY_OUT_Y);
};
