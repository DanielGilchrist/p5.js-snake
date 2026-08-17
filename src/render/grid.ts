import type p5 from "p5";

import type * as World from "../core/world";
import type * as Layout from "./layout";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Surface from "./surface";

const FLOOR_RADIUS = 0.32;
const RECESS_WEIGHT = 3;
const RECESS_ALPHA = 34;

export const draw = <B>(
  p: p5,
  scheme: Palette.Scheme,
  world: World.Type<B>,
  layout: Layout.Metrics,
  surface: Surface.Surface,
): void => {
  const block = layout.blockWidth;
  const { origin } = layout;
  const width = world.board.cols * block;
  const height = world.board.rows * block;

  p.noStroke();

  Surface.casement(p, surface);

  Paint.fill(p, Palette.shift(scheme.floor, Palette.floorTint(world.variant)));
  p.rect(
    origin.x + block,
    origin.y + block,
    width - block * 2,
    height - block * 2,
    block * FLOOR_RADIUS,
  );

  Surface.floor(p, surface);

  p.noFill();
  Paint.strokeWith(p, scheme.shadow, Paint.alpha(RECESS_ALPHA));
  p.strokeWeight(RECESS_WEIGHT);
  p.rect(
    origin.x + block,
    origin.y + block,
    width - block * 2,
    height - block * 2,
    block * FLOOR_RADIUS,
  );
};
