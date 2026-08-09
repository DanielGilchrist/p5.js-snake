import type p5 from "p5";

import type { BoardError, Cell } from "../core/board";
import type { Brand } from "../core/brand";
import type { Ending, GameState, World } from "../core/game";
import type { Direction } from "../core/geometry";
import { assertNever } from "../core/result";
import type { Snake } from "../core/snake";
import { centreOf, toPixels, type Layout } from "./layout";
import { BACKGROUND, FLOOR, FOOD, SNAKE, WALL, floorTint, shift, tint } from "./palette";
import { millis, px, shiftBy, type Millis, type Offset, type Point, type Px } from "./units";

type Vitality = "alive" | "dead";

type BannerLine = { readonly text: string; readonly size: Px };

type Alpha = Brand<number, "Alpha">;

const alpha = (n: number): Alpha => n as Alpha;

const SNAKE_EDGE = tint(40);
const FOOD_EDGE = tint(30);

const HEAD_ALPHA = 255;
const TAIL_ALPHA = 200;
const HEAD_RADIUS = 0.3;
const TAIL_RADIUS = 0.2;
const EYE_RATIO = 1 / 5;
const LIVE_EYE_SCALE = 0.7;
const DEAD_EYE_SCALE = 1.8;

const eyeOffsets = (facing: Direction, size: Px): readonly [Offset, Offset] => {
  const forward = px(size / 2 + size * 0.15);
  const backward = px(size / 2 - size * 0.15);
  const nearSide = px(size / 4);
  const farSide = px(size / 1.25);

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
      return assertNever(facing);
  }
};

const drawCells = <B>(p: p5, cells: readonly Cell<B>[], layout: Layout): void => {
  for (const target of cells) {
    const at = toPixels(layout, target);
    p.rect(at.x, at.y, layout.blockWidth, layout.blockWidth);
  }
};

const drawGrid = <B>(p: p5, world: World<B>, layout: Layout): void => {
  p.noStroke();

  p.fill(...WALL);
  drawCells(p, world.board.walls, layout);

  p.fill(...shift(FLOOR, floorTint(world.variant)));
  drawCells(p, world.board.playable, layout);
};

const drawFood = <B>(p: p5, food: Cell<B>, layout: Layout, elapsed: Millis): void => {
  const pulse = 1 + Math.sin(elapsed * 0.01) * 0.05;
  const size = layout.blockWidth * 0.8 * pulse;
  const centre = centreOf(layout, food);

  p.fill(...FOOD);
  p.stroke(...shift(FOOD, FOOD_EDGE));
  p.strokeWeight(2);
  p.rect(centre.x - size / 2, centre.y - size / 2, size, size, size * 0.15);
};

const drawEyes = (p: p5, head: Point, facing: Direction, block: Px, vitality: Vitality): void => {
  const [left, right] = eyeOffsets(facing, block);

  switch (vitality) {
    case "dead": {
      const half = (block * EYE_RATIO * DEAD_EYE_SCALE) / 4;
      p.stroke(0, 0, 0);
      p.strokeWeight(2);

      for (const offset of [left, right]) {
        const at = shiftBy(head, offset);
        p.line(at.x - half, at.y - half, at.x + half, at.y + half);
        p.line(at.x + half, at.y - half, at.x - half, at.y + half);
      }

      return;
    }

    case "alive": {
      const size = block * EYE_RATIO * LIVE_EYE_SCALE;
      p.fill(0, 0, 0);
      p.noStroke();

      for (const offset of [left, right]) {
        const at = shiftBy(head, offset);
        p.circle(at.x, at.y, size);
      }

      return;
    }

    default:
      return assertNever(vitality);
  }
};

const drawSegment = (p: p5, at: Point, block: Px, radius: number, opacity: number): void => {
  p.fill(SNAKE[0], SNAKE[1], SNAKE[2], opacity);
  p.stroke(...shift(SNAKE, SNAKE_EDGE));
  p.strokeWeight(1);
  p.rect(at.x + 1, at.y + 1, block - 2, block - 2, block * radius);
};

const drawSnake = <B>(p: p5, snake: Snake<B>, layout: Layout, vitality: Vitality): void => {
  const block = layout.blockWidth;
  const head = toPixels(layout, snake.head);

  drawSegment(p, head, block, HEAD_RADIUS, HEAD_ALPHA);

  for (const segment of snake.tail) {
    drawSegment(p, toPixels(layout, segment), block, TAIL_RADIUS, TAIL_ALPHA);
  }

  drawEyes(p, head, snake.facing, block, vitality);
};

const drawScore = <B>(p: p5, world: World<B>, layout: Layout): void => {
  p.push();
  p.textAlign(p.LEFT, p.BASELINE);
  p.textSize(layout.blockWidth / 1.5);
  p.textStyle(p.BOLD);
  p.stroke(0, 0, 0);
  p.strokeWeight(1);
  p.fill(220, 220, 220);
  p.text(
    `Score: ${world.score}`,
    layout.blockWidth,
    Math.max(layout.blockWidth, layout.origin.y - 8),
  );
  p.pop();
};

const drawBanner = (p: p5, lines: readonly BannerLine[], scrim: Alpha): void => {
  p.push();
  p.fill(0, 0, 0, scrim);
  p.rect(0, 0, p.width, p.height);
  p.fill(255, 255, 255);
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
  ending: Ending,
): { readonly title: string; readonly vitality: Vitality } => {
  switch (ending) {
    case "collision":
      return { title: "GAME OVER", vitality: "dead" };
    case "filled":
      return { title: "YOU WIN", vitality: "alive" };
    default:
      return assertNever(ending);
  }
};

const drawWorld = <B>(p: p5, world: World<B>, layout: Layout, vitality: Vitality): void => {
  drawGrid(p, world, layout);
  drawFood(p, world.food, layout, millis(p.millis()));
  drawSnake(p, world.snake, layout, vitality);
  drawScore(p, world, layout);
};

export const render = <B>(p: p5, state: GameState<B>, layout: Layout): void => {
  p.background(...BACKGROUND);

  switch (state.kind) {
    case "playing":
      drawWorld(p, state.world, layout, "alive");
      return;

    case "paused":
      drawWorld(p, state.world, layout, "alive");
      drawBanner(p, [{ text: "PAUSED", size: px(50) }], alpha(80));
      return;

    case "over": {
      const outcome = describeEnding(state.ending);
      drawWorld(p, state.world, layout, outcome.vitality);
      drawBanner(
        p,
        [
          { text: outcome.title, size: px(60) },
          { text: `Score: ${state.world.score}`, size: px(30) },
          { text: "Press any key to restart", size: px(20) },
        ],
        alpha(150),
      );
      return;
    }

    default:
      return assertNever(state);
  }
};

const explain = (error: BoardError): string => {
  switch (error.kind) {
    case "too-small":
      return `Window too small to play (${error.given.cols}x${error.given.rows})`;
    default:
      return assertNever(error.kind);
  }
};

export const renderBoardError = (p: p5, error: BoardError): void => {
  p.background(...BACKGROUND);
  p.fill(220, 220, 220);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(20);
  p.text(explain(error), p.width / 2, p.height / 2);
};
