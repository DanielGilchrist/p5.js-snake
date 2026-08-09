import type p5 from "p5";

import * as Assert from "../core/assert";
import type * as Option from "../core/option";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Pad from "./pad";
import * as Units from "./units";

const CASE_RADIUS = 0.06;
const SCREEN_BEZEL = 0.5;

const CROSS_RADIUS = 0.28;
const CASE_DROP = 0.14;
const CAP_RATIO = 0.9;
const SOCKET_ALPHA = 44;
const DROP = 0.16;
const CAP_LIFT = 0.1;
const SUNK_LIFT = 0.03;

const GLYPH_RATIO = 0.34;
const BAR_WIDTH = 0.2;
const BAR_HEIGHT = 0.58;
const BAR_GAP = 0.17;

const SWAP_BAR = 0.15;
const SWAP_HEAD = 0.42;
const SWAP_NIB = 0.4;
const SWAP_GAP = 0.36;
const ROUND_GLYPH = 1.35;
const CUT = 0.022;
const LIP_ALPHA = Paint.alpha(52);

export const shell = (p: p5, device: Units.Region, stage: Units.Region): void => {
  const radius = Math.min(device.width, device.height) * CASE_RADIUS;
  const drop = radius * CASE_DROP;

  p.noStroke();

  Paint.fillWith(p, Palette.SHADOW, Paint.alpha(58));
  p.rect(device.left, device.top + drop, device.width, device.height, radius);

  Paint.fill(p, Palette.BODY);
  p.rect(device.left, device.top, device.width, device.height, radius);

  const bezel = Math.min(stage.width, stage.height) * 0.03;

  Paint.fillWith(p, Palette.SHADOW, Paint.alpha(52));
  p.rect(
    stage.left - bezel,
    stage.top - bezel,
    stage.width + bezel * 2,
    stage.height + bezel * 2,
    bezel * 2 * SCREEN_BEZEL + radius * 0.4,
  );
};

const arrow = (p: p5, control: Pad.Control, reach: number): void => {
  const tip = reach;
  const back = -reach * 0.5;
  const flank = reach * 0.78;

  switch (control) {
    case "up":
      p.triangle(0, -tip, -flank, -back, flank, -back);
      return;
    case "down":
      p.triangle(0, tip, -flank, back, flank, back);
      return;
    case "left":
      p.triangle(-tip, 0, -back, -flank, -back, flank);
      return;
    case "right":
      p.triangle(tip, 0, back, -flank, back, flank);
      return;
    case "flip": {
      const span = reach;
      const bar = reach * SWAP_BAR;
      const head = reach * SWAP_HEAD;
      const nib = reach * SWAP_NIB;
      const gap = reach * SWAP_GAP;

      p.rect(-span, -gap - bar, span * 2 - nib, bar * 2, bar);
      p.triangle(span, -gap, span - nib, -gap - head, span - nib, -gap + head);

      p.rect(-span + nib, gap - bar, span * 2 - nib, bar * 2, bar);
      p.triangle(-span, gap, -span + nib, gap - head, -span + nib, gap + head);

      return;
    }
    case "pause": {
      const width = reach * BAR_WIDTH * 2;
      const height = reach * BAR_HEIGHT * 2;
      const gap = reach * BAR_GAP;

      p.rect(-gap - width, -height / 2, width, height, width * 0.35);
      p.rect(gap, -height / 2, width, height, width * 0.35);

      return;
    }
    default:
      return Assert.never(control);
  }
};

const engraved = (
  p: p5,
  control: Pad.Control,
  at: Units.Point,
  reach: number,
  cut: number,
): void => {
  Paint.fillWith(p, Palette.PAPER, LIP_ALPHA);
  p.push();
  p.translate(at.x, at.y + cut);
  arrow(p, control, reach);
  p.pop();

  Paint.fill(p, Palette.INK);
  p.push();
  p.translate(at.x, at.y);
  arrow(p, control, reach);
  p.pop();
};

const cross = (p: p5, of: Pad.Pad, lift: number): void => {
  const radius = of.arm * CROSS_RADIUS * 2;

  p.rect(-of.span, -of.arm, of.span * 2, of.arm * 2, radius);
  p.rect(-of.arm, -of.span + lift, of.arm * 2, of.span * 2, radius);
};

export const draw = (p: p5, of: Pad.Pad, held: Option.Type<Pad.Control>): void => {
  const down = (control: Pad.Control): boolean => held.some && held.value === control;
  const cut = Math.max(1, of.arm * CUT * 2);
  const turning = held.some && held.value !== "pause" && held.value !== "flip";

  p.noStroke();

  p.push();
  p.translate(of.seat.x, of.seat.y);

  Paint.fillWith(p, Palette.SHADOW, Paint.alpha(SOCKET_ALPHA));
  cross(p, of, 0);

  Paint.fillWith(p, Palette.SHADOW, Paint.alpha(turning ? 40 : 58));
  p.push();
  p.translate(0, of.arm * DROP);
  cross(p, of, 0);
  p.pop();

  Paint.fill(p, Palette.WALL);
  p.push();
  p.translate(0, -of.arm * (turning ? SUNK_LIFT : CAP_LIFT));
  cross(p, of, 0);
  p.pop();

  p.pop();

  for (const control of ["up", "down", "left", "right"] as const) {
    const at = Pad.armOf(of, control);
    const sunk = down(control) ? SUNK_LIFT : CAP_LIFT;

    engraved(p, control, Units.point(at.x, at.y - of.arm * sunk), of.arm * GLYPH_RATIO * 2, cut);
  }

  for (const control of ["pause", "flip"] as const) {
    const seat = Pad.armOf(of, control);
    const sunk = down(control);
    const lift = -of.button * (sunk ? SUNK_LIFT : CAP_LIFT);

    p.push();
    p.translate(seat.x, seat.y);

    Paint.fillWith(p, Palette.SHADOW, Paint.alpha(SOCKET_ALPHA));
    p.circle(0, 0, of.button * 2);

    Paint.fillWith(p, Palette.SHADOW, Paint.alpha(sunk ? 40 : 58));
    p.circle(0, of.button * DROP, of.button * 2 * CAP_RATIO);

    Paint.fill(p, Palette.WALL);
    p.circle(0, lift, of.button * 2 * CAP_RATIO);

    p.pop();

    engraved(
      p,
      control,
      Units.point(seat.x, seat.y + lift),
      of.button * GLYPH_RATIO * ROUND_GLYPH,
      cut,
    );
  }
};
