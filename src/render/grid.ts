import type p5 from "p5";

import type * as Board from "../core/board";
import type * as World from "../core/world";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Palette from "./palette";

const cells = <B>(p: p5, targets: readonly Board.Cell<B>[], layout: Layout.Metrics): void => {
  for (const target of targets) {
    const at = Layout.toPixels(layout, target);

    p.rect(at.x, at.y, layout.blockWidth, layout.blockWidth);
  }
};

export const draw = <B>(p: p5, world: World.Type<B>, layout: Layout.Metrics): void => {
  p.noStroke();

  Paint.fill(p, Palette.WALL);
  cells(p, world.board.walls, layout);

  Paint.fill(p, Palette.shift(Palette.FLOOR, Palette.floorTint(world.variant)));
  cells(p, world.board.playable, layout);
};
