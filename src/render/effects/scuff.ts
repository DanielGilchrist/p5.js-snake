import type p5 from "p5";

import * as Ease from "../ease";
import * as Paint from "../paint";
import type * as Palette from "../palette";
import * as Sculpt from "../sculpt";
import type * as Units from "../units";

const SPREAD = 1.35;
const LOBES = 13;
const ROUGHNESS = 0.42;
const SETTLE = 0.14;
const DARK = 74;
const LIP = 34;
const LIP_DROP = 0.05;

export const draw = (
  p: p5,
  scheme: Palette.Scheme,
  at: Units.Point,
  colour: Palette.Rgb,
  t: number,
  block: Units.Px,
  born: Units.Millis,
): void => {
  const landed = Math.min(1, t / SETTLE);
  const reach = block * SPREAD * Ease.outBack(landed) * 0.5;
  const fade = Ease.fadeOut(t, 1.6);
  const seed = (born * 0.011) % 97;

  const smear = Sculpt.lump({
    radiusX: reach,
    radiusY: reach * 0.78,
    lobes: LOBES,
    roughness: ROUGHNESS,
    pinch: 0,
    seed,
  });

  p.push();
  p.translate(at.x, at.y);
  p.noStroke();

  Paint.fillWith(p, scheme.shadow, Paint.alpha(DARK * fade));
  Sculpt.press(p, smear);

  p.push();
  p.translate(0, -reach * LIP_DROP);
  Paint.fillWith(p, colour, Paint.alpha(LIP * fade));
  Sculpt.press(p, smear);
  p.pop();

  p.pop();
};
