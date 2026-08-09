import type p5 from "p5";

import type * as Board from "../core/board";
import type * as Layout from "./layout";
import * as Palette from "./palette";
import * as Sculpt from "./sculpt";
import * as Units from "./units";

export type Surface = {
  readonly grain: p5.Graphics;
  readonly at: Units.Point;
  readonly art: p5.Graphics;
};

const SPECKS_PER_CELL = 3;
const SPECK_ALPHA = 13;
const SPECK_SIZE = 0.09;

const DIMPLE_ALPHA = 14;
const DIMPLE_LIP = 11;
const DIMPLE_SIZE = 0.05;

const EDGE_RINGS = 7;
const EDGE_ALPHA = 9;
const FLOOR_RADIUS = 0.32;

const shade = (buffer: p5.Graphics, colour: Palette.Rgb, alpha: number): void => {
  buffer.fill(colour.red, colour.green, colour.blue, alpha);
};

const speckle = (buffer: p5.Graphics, cols: number, rows: number, block: number): void => {
  const total = cols * rows * SPECKS_PER_CELL;

  buffer.noStroke();

  for (let i = 0; i < total; i++) {
    const x = Sculpt.hash(i + 1, 3) * cols * block;
    const y = Sculpt.hash(i + 1, 7) * rows * block;
    const size = block * SPECK_SIZE * (0.4 + Sculpt.hash(i + 1, 11));
    const darker = Sculpt.hash(i + 1, 13) > 0.5;

    shade(buffer, darker ? Palette.SHADOW : Palette.PAPER, SPECK_ALPHA);
    buffer.ellipse(x, y, size, size * 0.8);
  }
};

const dimples = (buffer: p5.Graphics, cols: number, rows: number, block: number): void => {
  const size = block * DIMPLE_SIZE;

  buffer.noStroke();

  for (let col = 1; col < cols; col++) {
    for (let row = 1; row < rows; row++) {
      const x = col * block;
      const y = row * block;

      shade(buffer, Palette.SHADOW, DIMPLE_ALPHA);
      buffer.circle(x, y, size);
      shade(buffer, Palette.PAPER, DIMPLE_LIP);
      buffer.circle(x, y + size * 0.55, size);
    }
  }
};

const recess = (buffer: p5.Graphics, width: number, height: number, block: number): void => {
  buffer.noFill();
  buffer.strokeWeight(2);

  for (let ring = 0; ring < EDGE_RINGS; ring++) {
    const inset = ring * 2;

    buffer.stroke(
      Palette.SHADOW.red,
      Palette.SHADOW.green,
      Palette.SHADOW.blue,
      EDGE_ALPHA * (1 - ring / EDGE_RINGS),
    );
    buffer.rect(inset, inset, width - inset * 2, height - inset * 2, block * FLOOR_RADIUS);
  }

  buffer.noStroke();
};

const PRESS_STEP = 0.82;
const PRESS_SIZE = 0.62;
const PRESS_JITTER = 0.5;
const PRESS_RELIEF = 0.07;
const PRESS_SHADE = 30;
const PRESS_LIGHT = 34;
const PRESS_FADE = 7;
const PRESS_NEAR = 0.4;

type Patch = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

const patch = (fields: Patch): Patch => ({ ...fields });

const beyond = (of: Patch, x: number, y: number, room: number): boolean =>
  x < of.left - room ||
  x > of.left + of.width + room ||
  y < of.top - room ||
  y > of.top + of.height + room;

const awayFrom = (of: Patch, x: number, y: number): number =>
  Math.max(of.left - x, x - (of.left + of.width), of.top - y, y - (of.top + of.height));

const presses = (art: p5.Graphics, taken: Patch, block: number): void => {
  const step = block * PRESS_STEP;
  const reach = block * PRESS_FADE;
  const cols = Math.ceil(art.width / step) + 1;
  const rows = Math.ceil(art.height / step) + 1;

  art.noStroke();

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const index = col * rows + row;
      const x = (col + (Sculpt.hash(index + 3, 5) - 0.5) * PRESS_JITTER) * step;
      const y = (row + (Sculpt.hash(index + 3, 11) - 0.5) * PRESS_JITTER) * step;

      if (!beyond(taken, x, y, block * 0.4)) continue;

      const away = Math.min(1, Math.max(0, awayFrom(taken, x, y) / reach));
      const strength = PRESS_NEAR + (1 - PRESS_NEAR) * away;
      const size = block * PRESS_SIZE * (0.7 + Sculpt.hash(index + 3, 17) * 0.8);
      const relief = size * PRESS_RELIEF;
      const tilt = Sculpt.hash(index + 3, 23) * Math.PI;

      art.push();
      art.translate(x, y);
      art.rotate(tilt);

      shade(art, Palette.SHADOW, PRESS_SHADE * strength);
      art.ellipse(-relief, -relief, size, size * 0.86);

      shade(art, Palette.PAPER, PRESS_LIGHT * strength);
      art.ellipse(relief, relief, size, size * 0.86);

      art.pop();
    }
  }
};

const bake = <B>(p: p5, board: Board.Grid<B>, layout: Layout.Metrics): p5.Graphics => {
  const block = layout.blockWidth;
  const art = p.createGraphics(p.width, p.height);
  const taken = patch({
    left: layout.origin.x,
    top: layout.origin.y,
    width: board.cols * block,
    height: board.rows * block,
  });

  art.pixelDensity(1);
  art.clear();
  art.noStroke();

  presses(art, taken, block);

  return art;
};

export const of = <B>(p: p5, board: Board.Grid<B>, layout: Layout.Metrics): Surface => {
  const block = layout.blockWidth;
  const cols = board.cols - 2;
  const rows = board.rows - 2;
  const width = Math.ceil(cols * block);
  const height = Math.ceil(rows * block);
  const grain = p.createGraphics(width, height);

  grain.clear();
  speckle(grain, cols, rows, block);
  dimples(grain, cols, rows, block);
  recess(grain, width, height, block);

  return {
    grain,
    at: Units.point(layout.origin.x + block, layout.origin.y + block),
    art: bake(p, board, layout),
  };
};

export const floor = (p: p5, surface: Surface): void => {
  p.image(surface.grain, surface.at.x, surface.at.y);
};

export const table = (p: p5, surface: Surface): void => {
  p.image(surface.art, 0, 0);
};
