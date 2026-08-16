import type p5 from "p5";

import * as Assert from "../core/assert";
import * as Geometry from "../core/geometry";
import * as Option from "../core/option";
import * as Snake from "../core/snake";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Spine from "./spine";
import * as Tag from "./tag";
import * as Units from "./units";

export const ALIVE = "alive";
export const DEAD = "dead";

export type Vitality = typeof ALIVE | typeof DEAD;

const HEAD_WIDTH = 0.94;
const TAIL_WIDTH = 0.52;
const RING_PACE = 420;

const CREST_RATIO = 0.78;
const CREST_LIFT = 0.07;

const SHADOW_DROP = 0.075;
const SHADOW_ALPHA = Paint.alpha(44);

const LEAN = 0.16;

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

const leanOf = (turning: Option.Type<Geometry.Direction>, block: Units.Px): Units.Offset => {
  if (!turning.some) return Units.NO_OFFSET;

  const reach = block * LEAN;

  switch (turning.value) {
    case Geometry.UP:
      return Units.offset(0, -reach);
    case Geometry.DOWN:
      return Units.offset(0, reach);
    case Geometry.LEFT:
      return Units.offset(-reach, 0);
    case Geometry.RIGHT:
      return Units.offset(reach, 0);
    default:
      return Assert.never(turning.value);
  }
};

const eyeOffsets = (
  facing: Geometry.Direction,
  size: number,
): readonly [Units.Offset, Units.Offset] => {
  const forward = size * 0.28;
  const nearSide = -size * 0.24;
  const farSide = size * 0.24;

  switch (facing) {
    case Geometry.UP:
      return [Units.offset(nearSide, -forward), Units.offset(farSide, -forward)];
    case Geometry.DOWN:
      return [Units.offset(nearSide, forward), Units.offset(farSide, forward)];
    case Geometry.LEFT:
      return [Units.offset(-forward, nearSide), Units.offset(-forward, farSide)];
    case Geometry.RIGHT:
      return [Units.offset(forward, nearSide), Units.offset(forward, farSide)];
    default:
      return Assert.never(facing);
  }
};

const eyes = (
  p: p5,
  scheme: Palette.Scheme,
  head: Units.Point,
  facing: Geometry.Direction,
  size: number,
  vitality: Vitality,
): void => {
  const offsets = eyeOffsets(facing, size);

  switch (vitality) {
    case DEAD: {
      const half = (size * EYE_RATIO * DEAD_EYE_SCALE) / 4;

      Paint.stroke(p, scheme.mark);
      p.strokeWeight(2);

      for (const offset of offsets) {
        const at = Units.shiftBy(head, offset);

        p.line(at.x - half, at.y - half, at.x + half, at.y + half);
        p.line(at.x + half, at.y - half, at.x - half, at.y + half);
      }

      return;
    }

    case ALIVE: {
      p.noStroke();
      Paint.fill(p, scheme.mark);

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
  opacity: Paint.Alpha,
  scale: number,
  lift: number,
): void => {
  p.noFill();
  Paint.strokeWith(p, colour, opacity);
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

const TAG_CLEAR = 1.9;

const roomy = (
  tag: Tag.Tag,
  crest: Units.Point,
  block: Units.Px,
  layout: Layout.Metrics,
): Tag.Tag => (crest.y - block * TAG_CLEAR >= layout.origin.y ? tag : { ...tag, above: false });

export const draw = <B>(
  p: p5,
  scheme: Palette.Scheme,
  snake: Snake.State<B>,
  previous: Snake.State<B>,
  blend: number,
  layout: Layout.Metrics,
  vitality: Vitality,
  bite: Units.Millis,
  turning: Option.Type<Geometry.Direction>,
  body: Palette.Body,
  tag: Option.Type<Tag.Tag> = Option.none,
): void => {
  const block = layout.blockWidth;
  const now = Units.millis(p.millis());
  const spine = Spine.of(snake, previous, blend, layout);
  const [nose] = spine;

  if (nose === undefined) return;

  const head = nose.at;
  const lean = leanOf(turning, block);
  const bulge = bulgeAt(now, bite);
  const crown = block * HEAD_WIDTH * bulge;
  const crest = Units.point(head.x + lean.dx, head.y - block * CREST_LIFT + lean.dy);

  tube(p, spine, block, scheme.shadow, SHADOW_ALPHA, 1, block * SHADOW_DROP);

  p.noStroke();
  Paint.fillWith(p, scheme.shadow, SHADOW_ALPHA);
  p.circle(head.x, head.y + block * SHADOW_DROP, crown);

  tube(p, spine, block, body.deep, Paint.OPAQUE, 1, 0);

  p.noStroke();
  Paint.fill(p, body.deep);
  p.circle(head.x, head.y, crown);

  tube(p, spine, block, body.skin, Paint.OPAQUE, CREST_RATIO, -block * CREST_LIFT);

  p.noStroke();
  Paint.fill(p, body.skin);
  p.circle(crest.x, crest.y, crown * CREST_RATIO);

  eyes(p, scheme, crest, snake.facing, crown * CREST_RATIO, vitality);

  if (!tag.some) return;

  if (tag.value.mine) Tag.ring(p, scheme, head, block, body, now / RING_PACE);

  Tag.draw(p, scheme, crest, block, body, roomy(tag.value, crest, block, layout));
};
