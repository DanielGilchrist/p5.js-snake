import type p5 from "p5";

import type * as World from "../core/world";
import * as Clay from "./clay";
import * as Layout from "./layout";
import * as Morsel from "./morsel";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as SnakeView from "./snake";
import * as Geometry from "../core/geometry";
import * as Units from "./units";

export type Badge = {
  readonly seat: number;
  readonly facing: Geometry.Direction;
  readonly vitality: SnakeView.Vitality;
};

export const badge = (
  seat: number,
  facing: Geometry.Direction,
  vitality: SnakeView.Vitality,
): Badge => ({ seat, facing, vitality });

export type Line = {
  readonly text: string;
  readonly scale: number;
  readonly badges: readonly Badge[];
};

export const line = (text: string, scale: number): Line => ({ text, scale, badges: [] });

export const badged = (worn: readonly Badge[], text: string, scale: number): Line => ({
  text,
  scale,
  badges: worn,
});

const PLATE_PAD = 0.62;
const PLATE_MIN = 2.1;
const PLATE_HEIGHT = 0.72;
const PLATE_RADIUS = 0.24;
const PLATE_SINK = 16;
const PLATE_LIP = 26;

const DIGIT_RATIO = 0.42;
const TOKEN_RATIO = 0.4;
const TOKEN_GAP = 0.34;
const TOKEN_SIT = 0.11;

const TABLET_PAD_X = 1.4;
const TABLET_PAD_Y = 0.9;
const TABLET_RADIUS = 0.36;
const LINE_HEIGHT = 1.55;
const MIN_TEXT = 15;

const BADGE_RATIO = 1.05;
const BADGE_GAP = 0.34;

const badgeRoom = (entry: Line, size: number): number =>
  entry.badges.length * size * (BADGE_RATIO + BADGE_GAP);

const sizeOf = (block: Units.Px, scale: number): number => Math.max(MIN_TEXT, block * scale);

const cutOf = (block: Units.Px): number => Math.max(1.2, block * 0.03);

export const engrave = (
  p: p5,
  scheme: Palette.Scheme,
  text: string,
  x: number,
  y: number,
  block: Units.Px,
): void => {
  const cut = cutOf(block);

  Paint.fillWith(p, scheme.markEdge, Paint.alpha(scheme.relief));
  p.text(text, x, y + cut);

  Paint.fill(p, scheme.mark);
  p.text(text, x, y - cut * 0.4);
};

export const plate = (
  p: p5,
  scheme: Palette.Scheme,
  width: number,
  height: number,
  block: Units.Px,
): void => {
  const cut = cutOf(block);

  Paint.fillWith(p, scheme.shadow, Paint.alpha(PLATE_SINK));
  p.rect(-width / 2, -height / 2, width, height, block * PLATE_RADIUS);

  Paint.fillWith(p, scheme.paper, Paint.alpha(PLATE_LIP));
  p.rect(-width / 2, -height / 2 + cut, width, height, block * PLATE_RADIUS);

  Paint.fillWith(p, scheme.shadow, Paint.alpha(PLATE_SINK));
  p.rect(-width / 2, -height / 2, width, height - cut, block * PLATE_RADIUS);
};

export const plateHeight = (block: Units.Px): number => block * PLATE_HEIGHT;

export const score = <B>(
  p: p5,
  scheme: Palette.Scheme,
  world: World.Type<B>,
  layout: Layout.Metrics,
  points: number,
  now: Units.Millis,
): void => {
  const block = layout.blockWidth;
  const middle = Units.point(
    layout.origin.x + (world.board.cols * block) / 2,
    layout.origin.y + block / 2,
  );
  const height = block * PLATE_HEIGHT;

  p.push();
  p.translate(middle.x, middle.y);
  p.noStroke();

  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(block * DIGIT_RATIO);

  const label = `${points}`;
  const token = block * TOKEN_RATIO;
  const gap = block * TOKEN_GAP;
  const digits = p.textWidth(label);
  const group = token + gap + digits;
  const width = Math.max(block * PLATE_MIN, group + block * PLATE_PAD * 2);
  const start = -group / 2;

  plate(p, scheme, width, height, block);

  engrave(p, scheme, label, start + token + gap + digits / 2, 0, block);

  const { breath, lean } = Morsel.stir(world, now);

  p.push();
  p.translate(start + token / 2, token * TOKEN_SIT);
  p.rotate(lean);
  Morsel.draw(
    p,
    scheme,
    Morsel.at(world.food),
    Morsel.seedAt(world.food),
    token * breath,
    token * 0.92 * (2 - breath),
  );
  p.pop();

  p.pop();
};

export const tablet = (
  p: p5,
  scheme: Palette.Scheme,
  lines: readonly Line[],
  layout: Layout.Metrics,
  stage: Units.Region,
  wash: Paint.Alpha = Paint.alpha(140),
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
    widest = Math.max(widest, p.textWidth(entry.text) + badgeRoom(entry, size));
    tall += size * LINE_HEIGHT;
  }

  const width = widest + block * TABLET_PAD_X * 2;
  const height = tall + block * TABLET_PAD_Y * 2;
  const middle = Units.point(stage.left + stage.width / 2, stage.top + stage.height / 2);

  Paint.fillWith(p, scheme.shadow, wash);
  p.rect(0, 0, p.width, p.height);

  Clay.cast(p, Clay.RAISED, scheme.shadow, () => {
    Paint.fill(p, scheme.wall);
    p.rect(middle.x - width / 2, middle.y - height / 2, width, height, block * TABLET_RADIUS);
  });

  let y = middle.y - tall / 2;

  for (const entry of lines) {
    const size = sizeOf(block, entry.scale);

    p.textSize(size);
    y += (size * LINE_HEIGHT) / 2;

    const room = badgeRoom(entry, size);
    const group = p.textWidth(entry.text) + room;
    const start = middle.x - group / 2;

    for (const [worn, shown] of entry.badges.entries()) {
      const step = size * (BADGE_RATIO + BADGE_GAP);

      SnakeView.head(
        p,
        scheme,
        Units.point(start + worn * step + (size * BADGE_RATIO) / 2, y),
        size * BADGE_RATIO,
        Palette.bodyFor(scheme, shown.seat),
        shown.facing,
        shown.vitality,
      );
    }

    engrave(p, scheme, entry.text, start + room + p.textWidth(entry.text) / 2, y, block);
    y += (size * LINE_HEIGHT) / 2;
  }

  p.pop();
};
