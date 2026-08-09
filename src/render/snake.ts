import type p5 from "p5";

import * as Assert from "../core/assert";
import type * as Geometry from "../core/geometry";
import * as Snake from "../core/snake";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Units from "./units";

export type Vitality = "alive" | "dead";

const EDGE = Palette.tint(40);

const HEAD_ALPHA = Paint.OPAQUE;
const TAIL_ALPHA = Paint.alpha(200);
const HEAD_RADIUS = 0.3;
const TAIL_RADIUS = 0.2;

const EYE_RATIO = 1 / 5;
const LIVE_EYE_SCALE = 0.7;
const DEAD_EYE_SCALE = 1.8;

const eyeOffsets = (
  facing: Geometry.Direction,
  size: Units.Px,
): readonly [Units.Offset, Units.Offset] => {
  const forward = size / 2 + size * 0.15;
  const backward = size / 2 - size * 0.15;
  const nearSide = size / 4;
  const farSide = size / 1.25;

  switch (facing) {
    case "up":
      return [Units.offset(nearSide, backward), Units.offset(farSide, backward)];
    case "down":
      return [Units.offset(nearSide, forward), Units.offset(farSide, forward)];
    case "left":
      return [Units.offset(backward, nearSide), Units.offset(backward, farSide)];
    case "right":
      return [Units.offset(forward, nearSide), Units.offset(forward, farSide)];
    default:
      return Assert.never(facing);
  }
};

const eyes = (
  p: p5,
  head: Units.Point,
  facing: Geometry.Direction,
  block: Units.Px,
  vitality: Vitality,
): void => {
  const offsets = eyeOffsets(facing, block);

  switch (vitality) {
    case "dead": {
      const half = (block * EYE_RATIO * DEAD_EYE_SCALE) / 4;

      Paint.stroke(p, Palette.INK);
      p.strokeWeight(2);

      for (const offset of offsets) {
        const at = Units.shiftBy(head, offset);

        p.line(at.x - half, at.y - half, at.x + half, at.y + half);
        p.line(at.x + half, at.y - half, at.x - half, at.y + half);
      }

      return;
    }

    case "alive": {
      const size = block * EYE_RATIO * LIVE_EYE_SCALE;

      Paint.fill(p, Palette.INK);
      p.noStroke();

      for (const offset of offsets) {
        const at = Units.shiftBy(head, offset);

        p.circle(at.x, at.y, size);
      }

      return;
    }

    default:
      return Assert.never(vitality);
  }
};

const segment = (
  p: p5,
  at: Units.Point,
  block: Units.Px,
  radius: number,
  opacity: Paint.Alpha,
): void => {
  Paint.fillWith(p, Palette.SNAKE, opacity);
  Paint.stroke(p, Palette.shift(Palette.SNAKE, EDGE));
  p.strokeWeight(1);
  p.rect(at.x + 1, at.y + 1, block - 2, block - 2, block * radius);
};

const glide = <B>(
  snake: Snake.State<B>,
  previous: Snake.State<B>,
  blend: number,
  layout: Layout.Metrics,
): readonly Units.Point[] => {
  const now = Snake.segments(snake);
  const before = Snake.segments(previous);

  return now.map((cell, index) => {
    const to = Layout.toPixels(layout, cell);
    const from = before[index];

    return from === undefined ? to : Layout.lerp(Layout.toPixels(layout, from), to, blend);
  });
};

export const draw = <B>(
  p: p5,
  snake: Snake.State<B>,
  previous: Snake.State<B>,
  blend: number,
  layout: Layout.Metrics,
  vitality: Vitality,
): void => {
  const block = layout.blockWidth;
  const points = glide(snake, previous, blend, layout);
  const [head] = points;

  if (head === undefined) return;

  for (let i = points.length - 1; i >= 1; i--) {
    const at = points[i];

    if (at !== undefined) segment(p, at, block, TAIL_RADIUS, TAIL_ALPHA);
  }

  segment(p, head, block, HEAD_RADIUS, HEAD_ALPHA);
  eyes(p, head, snake.facing, block, vitality);
};
