import type p5 from "p5";

import * as Assert from "../core/assert";
import type * as Option from "../core/option";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Geometry from "../core/geometry";
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

const GEAR_TEETH = 8;
const GEAR_TOOTH = 0.5;
const GEAR_ROOT = 0.72;
const GEAR_BORE = 0.34;
const GEAR_BORE_SIDES = 14;
const GEAR_FILLET = 0.06;

const ROUND_GLYPH = 1.35;
const CUT = 0.022;
const LIP_ALPHA = Paint.alpha(52);

export const shell = (
  p: p5,
  scheme: Palette.Scheme,
  device: Units.Region,
  stage: Units.Region,
): void => {
  const radius = Math.min(device.width, device.height) * CASE_RADIUS;
  const drop = radius * CASE_DROP;

  p.noStroke();

  Paint.fillWith(p, scheme.shadow, Paint.alpha(58));
  p.rect(device.left, device.top + drop, device.width, device.height, radius);

  Paint.fill(p, scheme.body);
  p.rect(device.left, device.top, device.width, device.height, radius);

  const bezel = Math.min(stage.width, stage.height) * 0.03;

  Paint.fillWith(p, scheme.shadow, Paint.alpha(52));
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
    case Geometry.UP:
      p.triangle(0, -tip, -flank, -back, flank, -back);
      return;
    case Geometry.DOWN:
      p.triangle(0, tip, -flank, back, flank, back);
      return;
    case Geometry.LEFT:
      p.triangle(-tip, 0, -back, -flank, -back, flank);
      return;
    case Geometry.RIGHT:
      p.triangle(tip, 0, back, -flank, back, flank);
      return;
    case Pad.MENU: {
      const step = (Math.PI * 2) / GEAR_TEETH;
      const half = step * GEAR_TOOTH * 0.5;
      const root = reach * GEAR_ROOT;
      const bore = reach * GEAR_BORE;

      p.beginShape();

      for (let i = 0; i < GEAR_TEETH; i++) {
        const mid = i * step + step / 2;

        p.vertex(
          Math.cos(mid - step / 2 + GEAR_FILLET) * root,
          Math.sin(mid - step / 2 + GEAR_FILLET) * root,
        );
        p.vertex(Math.cos(mid - half) * reach, Math.sin(mid - half) * reach);
        p.vertex(Math.cos(mid + half) * reach, Math.sin(mid + half) * reach);
        p.vertex(
          Math.cos(mid + step / 2 - GEAR_FILLET) * root,
          Math.sin(mid + step / 2 - GEAR_FILLET) * root,
        );
      }

      p.beginContour();

      for (let i = GEAR_BORE_SIDES; i > 0; i--) {
        const angle = (i / GEAR_BORE_SIDES) * Math.PI * 2;

        p.vertex(Math.cos(angle) * bore, Math.sin(angle) * bore);
      }

      p.endContour(p.CLOSE);
      p.endShape(p.CLOSE);

      return;
    }
    case Pad.PAUSE: {
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
  scheme: Palette.Scheme,
  control: Pad.Control,
  at: Units.Point,
  reach: number,
  cut: number,
): void => {
  Paint.fillWith(p, scheme.markEdge, LIP_ALPHA);
  p.push();
  p.translate(at.x, at.y + cut);
  arrow(p, control, reach);
  p.pop();

  Paint.fill(p, scheme.mark);
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

export const draw = (
  p: p5,
  scheme: Palette.Scheme,
  of: Pad.Pad,
  held: Option.Type<Pad.Control>,
  extras = true,
): void => {
  const down = (control: Pad.Control): boolean => held.some && held.value === control;
  const cut = Math.max(1, of.arm * CUT * 2);
  const turning = held.some && held.value !== Pad.PAUSE && held.value !== Pad.MENU;

  p.noStroke();

  p.push();
  p.translate(of.seat.x, of.seat.y);

  Paint.fillWith(p, scheme.shadow, Paint.alpha(SOCKET_ALPHA));
  cross(p, of, 0);

  Paint.fillWith(p, scheme.shadow, Paint.alpha(turning ? 40 : 58));
  p.push();
  p.translate(0, of.arm * DROP);
  cross(p, of, 0);
  p.pop();

  Paint.fill(p, scheme.wall);
  p.push();
  p.translate(0, -of.arm * (turning ? SUNK_LIFT : CAP_LIFT));
  cross(p, of, 0);
  p.pop();

  p.pop();

  for (const control of Geometry.DIRECTIONS) {
    const at = Pad.armOf(of, control);
    const sunk = down(control) ? SUNK_LIFT : CAP_LIFT;

    engraved(
      p,
      scheme,
      control,
      Units.point(at.x, at.y - of.arm * sunk),
      of.arm * GLYPH_RATIO * 2,
      cut,
    );
  }

  if (!extras) return;

  for (const control of Pad.SWITCHES) {
    const seat = Pad.armOf(of, control);
    const sunk = down(control);
    const lift = -of.button * (sunk ? SUNK_LIFT : CAP_LIFT);

    p.push();
    p.translate(seat.x, seat.y);

    Paint.fillWith(p, scheme.shadow, Paint.alpha(SOCKET_ALPHA));
    p.circle(0, 0, of.button * 2);

    Paint.fillWith(p, scheme.shadow, Paint.alpha(sunk ? 40 : 58));
    p.circle(0, of.button * DROP, of.button * 2 * CAP_RATIO);

    Paint.fill(p, scheme.wall);
    p.circle(0, lift, of.button * 2 * CAP_RATIO);

    p.pop();

    engraved(
      p,
      scheme,
      control,
      Units.point(seat.x, seat.y + lift),
      of.button * GLYPH_RATIO * ROUND_GLYPH,
      cut,
    );
  }
};
