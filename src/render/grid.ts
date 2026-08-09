import type p5 from "p5";

import type * as World from "../core/world";
import * as Clay from "./clay";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Surface from "./surface";

const FRAME_RADIUS = 0.55;
const FLOOR_RADIUS = 0.32;
const RECESS_WEIGHT = 3;
const RECESS_ALPHA = 34;

export const draw = <B>(
  p: p5,
  world: World.Type<B>,
  layout: Layout.Metrics,
  surface: Surface.Surface,
): void => {
  const block = layout.blockWidth;
  const { origin } = layout;
  const width = world.board.cols * block;
  const height = world.board.rows * block;

  p.noStroke();

  Clay.cast(p, Clay.RAISED, Palette.SHADOW, () => {
    Paint.fill(p, Palette.WALL);
    p.rect(origin.x, origin.y, width, height, block * FRAME_RADIUS);
  });

  Paint.fill(p, Palette.shift(Palette.FLOOR, Palette.floorTint(world.variant)));
  p.rect(
    origin.x + block,
    origin.y + block,
    width - block * 2,
    height - block * 2,
    block * FLOOR_RADIUS,
  );

  Surface.floor(p, surface);

  p.noFill();
  Paint.strokeWith(p, Palette.SHADOW, Paint.alpha(RECESS_ALPHA));
  p.strokeWeight(RECESS_WEIGHT);
  p.rect(
    origin.x + block,
    origin.y + block,
    width - block * 2,
    height - block * 2,
    block * FLOOR_RADIUS,
  );
};
