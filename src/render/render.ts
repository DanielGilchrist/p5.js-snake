import type p5 from "p5";

import type * as Board from "../core/board";
import type * as Brand from "../core/brand";
import * as Assert from "../core/assert";
import type * as Game from "../core/game";
import type * as Geometry from "../core/geometry";
import type * as Snake from "../core/snake";
import * as Layout from "./layout";
import * as Palette from "./palette";
import * as Units from "./units";

type Vitality = "alive" | "dead";

type BannerLine = { readonly text: string; readonly size: Units.Px };

type Alpha = Brand.Of<number, "Alpha">;

const alpha = (n: number): Alpha => n as Alpha;

const SNAKE_EDGE = Palette.tint(40);
const FOOD_EDGE = Palette.tint(30);

const HEAD_ALPHA = alpha(255);
const TAIL_ALPHA = alpha(200);
const HEAD_RADIUS = 0.3;
const TAIL_RADIUS = 0.2;
const EYE_RATIO = 1 / 5;
const LIVE_EYE_SCALE = 0.7;
const DEAD_EYE_SCALE = 1.8;

const fill = (p: p5, colour: Palette.Rgb): void => {
  p.fill(colour.red, colour.green, colour.blue);
};

const fillWith = (p: p5, colour: Palette.Rgb, opacity: Alpha): void => {
  p.fill(colour.red, colour.green, colour.blue, opacity);
};

const stroke = (p: p5, colour: Palette.Rgb): void => {
  p.stroke(colour.red, colour.green, colour.blue);
};

const eyeOffsets = (
  facing: Geometry.Direction,
  size: Units.Px,
): readonly [Units.Offset, Units.Offset] => {
  const forward = Units.px(size / 2 + size * 0.15);
  const backward = Units.px(size / 2 - size * 0.15);
  const nearSide = Units.px(size / 4);
  const farSide = Units.px(size / 1.25);

  switch (facing) {
    case "up":
      return [
        { dx: nearSide, dy: backward },
        { dx: farSide, dy: backward },
      ];
    case "down":
      return [
        { dx: nearSide, dy: forward },
        { dx: farSide, dy: forward },
      ];
    case "left":
      return [
        { dx: backward, dy: nearSide },
        { dx: backward, dy: farSide },
      ];
    case "right":
      return [
        { dx: forward, dy: nearSide },
        { dx: forward, dy: farSide },
      ];
    default:
      return Assert.never(facing);
  }
};

const drawCells = <B>(p: p5, cells: readonly Board.Cell<B>[], layout: Layout.Metrics): void => {
  for (const target of cells) {
    const at = Layout.toPixels(layout, target);
    p.rect(at.x, at.y, layout.blockWidth, layout.blockWidth);
  }
};

const drawGrid = <B>(p: p5, world: Game.World<B>, layout: Layout.Metrics): void => {
  p.noStroke();

  fill(p, Palette.WALL);
  drawCells(p, world.board.walls, layout);

  fill(p, Palette.shift(Palette.FLOOR, Palette.floorTint(world.variant)));
  drawCells(p, world.board.playable, layout);
};

const drawFood = <B>(
  p: p5,
  food: Board.Cell<B>,
  layout: Layout.Metrics,
  elapsed: Units.Millis,
): void => {
  const pulse = 1 + Math.sin(elapsed * 0.01) * 0.05;
  const size = layout.blockWidth * 0.8 * pulse;
  const centre = Layout.centreOf(layout, food);

  fill(p, Palette.FOOD);
  stroke(p, Palette.shift(Palette.FOOD, FOOD_EDGE));
  p.strokeWeight(2);
  p.rect(centre.x - size / 2, centre.y - size / 2, size, size, size * 0.15);
};

const drawEyes = (
  p: p5,
  head: Units.Point,
  facing: Geometry.Direction,
  block: Units.Px,
  vitality: Vitality,
): void => {
  const [left, right] = eyeOffsets(facing, block);

  switch (vitality) {
    case "dead": {
      const half = (block * EYE_RATIO * DEAD_EYE_SCALE) / 4;
      stroke(p, Palette.INK);
      p.strokeWeight(2);

      for (const offset of [left, right]) {
        const at = Units.shiftBy(head, offset);
        p.line(at.x - half, at.y - half, at.x + half, at.y + half);
        p.line(at.x + half, at.y - half, at.x - half, at.y + half);
      }

      return;
    }

    case "alive": {
      const size = block * EYE_RATIO * LIVE_EYE_SCALE;
      fill(p, Palette.INK);
      p.noStroke();

      for (const offset of [left, right]) {
        const at = Units.shiftBy(head, offset);
        p.circle(at.x, at.y, size);
      }

      return;
    }

    default:
      return Assert.never(vitality);
  }
};

const drawSegment = (
  p: p5,
  at: Units.Point,
  block: Units.Px,
  radius: number,
  opacity: Alpha,
): void => {
  fillWith(p, Palette.SNAKE, opacity);
  stroke(p, Palette.shift(Palette.SNAKE, SNAKE_EDGE));
  p.strokeWeight(1);
  p.rect(at.x + 1, at.y + 1, block - 2, block - 2, block * radius);
};

const drawSnake = <B>(
  p: p5,
  snake: Snake.State<B>,
  layout: Layout.Metrics,
  vitality: Vitality,
): void => {
  const block = layout.blockWidth;
  const head = Layout.toPixels(layout, snake.head);

  drawSegment(p, head, block, HEAD_RADIUS, HEAD_ALPHA);

  for (const segment of snake.tail) {
    drawSegment(p, Layout.toPixels(layout, segment), block, TAIL_RADIUS, TAIL_ALPHA);
  }

  drawEyes(p, head, snake.facing, block, vitality);
};

const drawScore = <B>(p: p5, world: Game.World<B>, layout: Layout.Metrics): void => {
  p.push();
  p.textAlign(p.LEFT, p.BASELINE);
  p.textSize(layout.blockWidth / 1.5);
  p.textStyle(p.BOLD);
  stroke(p, Palette.INK);
  p.strokeWeight(1);
  fill(p, Palette.TEXT);
  p.text(
    `Score: ${world.score}`,
    layout.blockWidth,
    Math.max(layout.blockWidth, layout.origin.y - 8),
  );
  p.pop();
};

const drawBanner = (p: p5, lines: readonly BannerLine[], scrim: Alpha): void => {
  p.push();
  fillWith(p, Palette.INK, scrim);
  p.rect(0, 0, p.width, p.height);
  fill(p, Palette.PAPER);
  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);

  let offset = -50;
  for (const line of lines) {
    p.textSize(line.size);
    p.text(line.text, p.width / 2, p.height / 2 + offset);
    offset += line.size + 20;
  }

  p.pop();
};

const describeEnding = (
  ending: Game.Ending,
): { readonly title: string; readonly vitality: Vitality } => {
  switch (ending) {
    case "collision":
      return { title: "GAME OVER", vitality: "dead" };
    case "filled":
      return { title: "YOU WIN", vitality: "alive" };
    default:
      return Assert.never(ending);
  }
};

const drawWorld = <B>(
  p: p5,
  world: Game.World<B>,
  layout: Layout.Metrics,
  vitality: Vitality,
): void => {
  drawGrid(p, world, layout);
  drawFood(p, world.food, layout, Units.millis(p.millis()));
  drawSnake(p, world.snake, layout, vitality);
  drawScore(p, world, layout);
};

export const draw = <B>(p: p5, state: Game.State<B>, layout: Layout.Metrics): void => {
  p.background(Palette.BACKGROUND.red, Palette.BACKGROUND.green, Palette.BACKGROUND.blue);

  switch (state.kind) {
    case "playing":
      drawWorld(p, state.world, layout, "alive");
      return;

    case "paused":
      drawWorld(p, state.world, layout, "alive");
      drawBanner(p, [{ text: "PAUSED", size: Units.px(50) }], alpha(80));
      return;

    case "over": {
      const outcome = describeEnding(state.ending);
      drawWorld(p, state.world, layout, outcome.vitality);
      drawBanner(
        p,
        [
          { text: outcome.title, size: Units.px(60) },
          { text: `Score: ${state.world.score}`, size: Units.px(30) },
          { text: "Press any key to restart", size: Units.px(20) },
        ],
        alpha(150),
      );
      return;
    }

    default:
      return Assert.never(state);
  }
};

const explain = (error: Board.Error): string => {
  switch (error.kind) {
    case "too-small":
      return `Window too small to play (${error.given.cols}x${error.given.rows})`;
    default:
      return Assert.never(error.kind);
  }
};

export const drawError = (p: p5, error: Board.Error): void => {
  p.background(Palette.BACKGROUND.red, Palette.BACKGROUND.green, Palette.BACKGROUND.blue);
  fill(p, Palette.TEXT);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(20);
  p.text(explain(error), p.width / 2, p.height / 2);
};
