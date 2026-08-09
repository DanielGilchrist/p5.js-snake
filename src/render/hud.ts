import type p5 from "p5";

import type * as World from "../core/world";
import * as Clay from "./clay";
import * as Layout from "./layout";
import * as Morsel from "./morsel";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Units from "./units";

export type Line = { readonly text: string; readonly scale: number };

export const line = (text: string, scale: number): Line => ({ text, scale });

const PLATE_WIDTH = 3.4;
const PLATE_HEIGHT = 0.72;
const PLATE_RADIUS = 0.24;
const PLATE_SINK = 16;
const PLATE_LIP = 26;

const DIGIT_RATIO = 0.42;
const TOKEN_RATIO = 0.4;
const TOKEN_GAP = 0.34;

const TABLET_PAD_X = 1.4;
const TABLET_PAD_Y = 0.9;
const TABLET_RADIUS = 0.36;
const LINE_HEIGHT = 1.55;
const MIN_TEXT = 15;

const sizeOf = (block: Units.Px, scale: number): number => Math.max(MIN_TEXT, block * scale);

const cutOf = (block: Units.Px): number => Math.max(1.2, block * 0.03);

const engrave = (p: p5, text: string, x: number, y: number, block: Units.Px): void => {
  const cut = cutOf(block);

  Paint.fillWith(p, Palette.PAPER, Paint.alpha(165));
  p.text(text, x, y + cut);

  Paint.fill(p, Palette.INK);
  p.text(text, x, y - cut * 0.4);
};

export const score = <B>(
  p: p5,
  world: World.Type<B>,
  layout: Layout.Metrics,
  points: number,
): void => {
  const block = layout.blockWidth;
  const middle = Units.point(
    layout.origin.x + (world.board.cols * block) / 2,
    layout.origin.y + block / 2,
  );
  const width = block * PLATE_WIDTH;
  const height = block * PLATE_HEIGHT;
  const cut = cutOf(block);

  p.push();
  p.translate(middle.x, middle.y);
  p.noStroke();

  Paint.fillWith(p, Palette.SHADOW, Paint.alpha(PLATE_SINK));
  p.rect(-width / 2, -height / 2, width, height, block * PLATE_RADIUS);

  Paint.fillWith(p, Palette.PAPER, Paint.alpha(PLATE_LIP));
  p.rect(-width / 2, -height / 2 + cut, width, height, block * PLATE_RADIUS);

  Paint.fillWith(p, Palette.SHADOW, Paint.alpha(PLATE_SINK));
  p.rect(-width / 2, -height / 2, width, height - cut, block * PLATE_RADIUS);

  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(block * DIGIT_RATIO);

  const label = `${points}`;
  const token = block * TOKEN_RATIO;
  const shift = block * TOKEN_GAP * 0.5;

  engrave(p, label, shift, 0, block);

  p.push();
  p.translate(shift - p.textWidth(label) / 2 - block * TOKEN_GAP, -token * 0.06);
  Morsel.draw(p, Morsel.EMBLEM, 11, token, token * 0.92);
  p.pop();

  p.pop();
};

export const tablet = (
  p: p5,
  lines: readonly Line[],
  layout: Layout.Metrics,
  wash: Paint.Alpha,
): void => {
  const block = layout.blockWidth;

  p.push();
  p.noStroke();
  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);

  let widest = 0;
  let tall = 0;

  for (const entry of lines) {
    const size = sizeOf(block, entry.scale);

    p.textSize(size);
    widest = Math.max(widest, p.textWidth(entry.text));
    tall += size * LINE_HEIGHT;
  }

  const width = widest + block * TABLET_PAD_X * 2;
  const height = tall + block * TABLET_PAD_Y * 2;
  const middle = Units.point(p.width / 2, p.height / 2);

  Paint.fillWith(p, Palette.SHADOW, wash);
  p.rect(0, 0, p.width, p.height);

  Clay.cast(p, Clay.RAISED, Palette.SHADOW, () => {
    Paint.fill(p, Palette.WALL);
    p.rect(middle.x - width / 2, middle.y - height / 2, width, height, block * TABLET_RADIUS);
  });

  let y = middle.y - tall / 2;

  for (const entry of lines) {
    const size = sizeOf(block, entry.scale);

    p.textSize(size);
    y += (size * LINE_HEIGHT) / 2;
    engrave(p, entry.text, middle.x, y, block);
    y += (size * LINE_HEIGHT) / 2;
  }

  p.pop();
};
