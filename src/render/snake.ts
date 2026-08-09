import type p5 from "p5";

import * as Assert from "../core/assert";
import type * as Geometry from "../core/geometry";
import * as Snake from "../core/snake";
import * as Clay from "./clay";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Spine from "./spine";
import * as Units from "./units";

export type Vitality = "alive" | "dead";

const HEAD_WIDTH = 0.94;
const TAIL_WIDTH = 0.52;
const CREST_RATIO = 0.78;
const CREST_LIFT = 0.07;

const BITE_MS = 220;
const BITE_BULGE = 0.3;

const EYE_RATIO = 1 / 5;
const LIVE_EYE_SCALE = 0.7;
const DEAD_EYE_SCALE = 1.8;

const widthAt = (along: number, block: Units.Px): number =>
  block * (HEAD_WIDTH + (TAIL_WIDTH - HEAD_WIDTH) * along);

const bulgeAt = (now: Units.Millis, bite: Units.Millis): number => {
  const since = now - bite;

  if (since < 0 || since > BITE_MS) return 1;

  return 1 + BITE_BULGE * (1 - since / BITE_MS) ** 2;
};

const eyeOffsets = (
  facing: Geometry.Direction,
  size: number,
): readonly [Units.Offset, Units.Offset] => {
  const forward = size * 0.28;
  const nearSide = -size * 0.24;
  const farSide = size * 0.24;

  switch (facing) {
    case "up":
      return [Units.offset(nearSide, -forward), Units.offset(farSide, -forward)];
    case "down":
      return [Units.offset(nearSide, forward), Units.offset(farSide, forward)];
    case "left":
      return [Units.offset(-forward, nearSide), Units.offset(-forward, farSide)];
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
  size: number,
  vitality: Vitality,
): void => {
  const offsets = eyeOffsets(facing, size);

  switch (vitality) {
    case "dead": {
      const half = (size * EYE_RATIO * DEAD_EYE_SCALE) / 4;

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
      p.noStroke();
      Paint.fill(p, Palette.INK);

      for (const offset of offsets) {
        const at = Units.shiftBy(head, offset);

        p.circle(at.x, at.y, size * EYE_RATIO * LIVE_EYE_SCALE);
      }

      return;
    }

    default:
      return Assert.never(vitality);
  }
};

const tube = (
  p: p5,
  spine: readonly Spine.Joint[],
  block: Units.Px,
  colour: Palette.Rgb,
  scale: number,
  lift: number,
): void => {
  p.noFill();
  Paint.stroke(p, colour);
  p.strokeCap(p.ROUND);
  p.strokeJoin(p.ROUND);

  for (let i = spine.length - 1; i >= 1; i--) {
    const from = spine[i];
    const to = spine[i - 1];

    if (from === undefined || to === undefined) continue;

    p.strokeWeight(widthAt(to.along, block) * scale);
    p.line(from.at.x, from.at.y + lift, to.at.x, to.at.y + lift);
  }
};

export const draw = <B>(
  p: p5,
  snake: Snake.State<B>,
  previous: Snake.State<B>,
  blend: number,
  layout: Layout.Metrics,
  vitality: Vitality,
  bite: Units.Millis,
): void => {
  const block = layout.blockWidth;
  const spine = Spine.of(snake, previous, blend, layout);
  const [nose] = spine;

  if (nose === undefined) return;

  const head = nose.at;
  const bulge = bulgeAt(Units.millis(p.millis()), bite);
  const crown = block * HEAD_WIDTH * bulge;
  const crest = Units.point(head.x, head.y - block * CREST_LIFT);

  Clay.cast(p, Clay.RESTING, Palette.SHADOW, () => {
    tube(p, spine, block, Palette.SNAKE_DEEP, 1, 0);
    p.noStroke();
    Paint.fill(p, Palette.SNAKE_DEEP);
    p.circle(head.x, head.y, crown);
  });

  tube(p, spine, block, Palette.SNAKE, CREST_RATIO, -block * CREST_LIFT);

  p.noStroke();
  Paint.fill(p, Palette.SNAKE);
  p.circle(crest.x, crest.y, crown * CREST_RATIO);

  eyes(p, crest, snake.facing, crown * CREST_RATIO, vitality);
};
