import type p5 from "p5";

import type * as Board from "../core/board";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Palette from "./palette";
import type * as Units from "./units";

const EDGE = Palette.tint(30);
const SIZE_RATIO = 0.8;
const PULSE_DEPTH = 0.05;
const PULSE_RATE = 0.01;
const CORNER_RATIO = 0.15;

export const draw = <B>(
  p: p5,
  food: Board.Cell<B>,
  layout: Layout.Metrics,
  elapsed: Units.Millis,
): void => {
  const pulse = 1 + Math.sin(elapsed * PULSE_RATE) * PULSE_DEPTH;
  const size = layout.blockWidth * SIZE_RATIO * pulse;
  const centre = Layout.centreOf(layout, food);

  Paint.fill(p, Palette.FOOD);
  Paint.stroke(p, Palette.shift(Palette.FOOD, EDGE));
  p.strokeWeight(2);
  p.rect(centre.x - size / 2, centre.y - size / 2, size, size, size * CORNER_RATIO);
};
