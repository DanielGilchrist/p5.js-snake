import type p5 from "p5";

import * as Ease from "../ease";
import * as Paint from "../paint";
import * as Palette from "../palette";
import type * as Units from "../units";

const TURN = Math.PI * 2;

const PUFF_LOBES = 5;
const PUFF_ORBIT = 0.5;
const PUFF_SPREAD = 1.15;
const PUFF_LOBE_SIZE = 0.62;
const PUFF_ALPHA = 215;

const DUST_SPREAD = 2.1;
const DUST_ALPHA = 150;
const DUST_WEIGHT = 7;

const WISP_COUNT = 7;
const WISP_REACH = 2.2;
const WISP_ARC = 0.42;
const WISP_ALPHA = 165;
const WISP_WEIGHT = 4.5;

const spinOf = (born: Units.Millis): number => (born * 0.013) % TURN;

export const puff = (
  p: p5,
  scheme: Palette.Scheme,
  at: Units.Point,
  t: number,
  block: Units.Px,
  born: Units.Millis,
): void => {
  const grow = Ease.outQuint(t);
  const orbit = block * (PUFF_ORBIT + grow * PUFF_SPREAD);
  const lobe = block * PUFF_LOBE_SIZE * Ease.fadeOut(t, 0.8);
  const spin = spinOf(born);

  p.noStroke();
  Paint.fillWith(p, scheme.paper, Paint.alpha(Ease.fadeOut(t, 1.7) * PUFF_ALPHA));

  for (let i = 0; i < PUFF_LOBES; i++) {
    const angle = (i / PUFF_LOBES) * TURN + spin;

    p.circle(at.x + Math.cos(angle) * orbit, at.y + Math.sin(angle) * orbit, lobe);
  }
};

export const dust = (
  p: p5,
  scheme: Palette.Scheme,
  at: Units.Point,
  t: number,
  block: Units.Px,
): void => {
  p.noFill();
  Paint.strokeWith(p, scheme.dust, Paint.alpha(Ease.fadeOut(t, 1.8) * DUST_ALPHA));
  p.strokeWeight(Math.max(0.5, DUST_WEIGHT * Ease.fadeOut(t, 1.4)));
  p.circle(at.x, at.y, block * (0.5 + Ease.outQuint(t) * DUST_SPREAD));
};

export const wisps = (
  p: p5,
  scheme: Palette.Scheme,
  at: Units.Point,
  t: number,
  block: Units.Px,
  born: Units.Millis,
): void => {
  const closing = Ease.outQuint(t);
  const spin = spinOf(born);
  const reach = block * (0.3 + (1 - closing) * WISP_REACH);
  const sweep = WISP_ARC * (1 - t);

  p.noFill();
  Paint.strokeWith(p, scheme.dust, Paint.alpha(Ease.fadeOut(t, 1.2) * WISP_ALPHA));
  p.strokeWeight(WISP_WEIGHT * (1 - t) + 0.4);
  p.strokeCap(p.ROUND);

  for (let i = 0; i < WISP_COUNT; i++) {
    const angle = (i / WISP_COUNT) * TURN + spin;

    p.arc(at.x, at.y, reach * 2, reach * 2, angle - sweep, angle + sweep);
  }
};
