import type p5 from "p5";

import type { Block } from "./block";
import { Food } from "./food";
import { Grid } from "./grid";
import { Score } from "./score";
import { Snake } from "./snake";
import { pointKey, type Drawable, type Rgb } from "./types";

const BLOCK_WIDTH = 35;
const GRID_COLOUR: Rgb = [45, 55, 75];
const SNAKE_COLOUR: Rgb = [76, 175, 80];
const FOOD_COLOUR: Rgb = [244, 67, 54];
const BACKGROUND_COLOUR: Rgb = [30, 35, 45];
const MIN_FRAME_RATE = 10;

type Move = () => void;

export class Game {
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private readonly moves: Record<"up" | "down" | "left" | "right", Move>;

  private grid: Grid;
  private snake: Snake;
  private food: Food;
  private score: Score;

  private inputQueue: Move[] = [];
  private paused = false;
  private gameOver = false;

  constructor(private readonly p: p5) {
    this.canvasWidth = p.windowWidth;
    this.canvasHeight = p.windowHeight;

    this.moves = {
      up: () => this.snake.up(),
      down: () => this.snake.down(),
      left: () => this.snake.left(),
      right: () => this.snake.right(),
    };

    p.createCanvas(this.canvasWidth, this.canvasHeight).parent(document.body);
    p.frameRate(this.frameRate());

    const { grid, snake, food, score } = this.build();
    this.grid = grid;
    this.snake = snake;
    this.food = food;
    this.score = score;

    this.placeNewFood();
  }

  newGame(): void {
    this.gameOver = false;
    this.inputQueue = [];

    const { grid, snake, food, score } = this.build();
    this.grid = grid;
    this.snake = snake;
    this.food = food;
    this.score = score;

    this.placeNewFood();
  }

  update(): void {
    this.drawBackground();

    if (this.paused) return this.drawPaused();
    if (this.gameOver) return this.drawGameOver();

    const move = this.inputQueue.shift();
    if (move) move();

    this.snake.update();
    this.grid.update();

    if (this.snake.isDead(this.grid)) {
      this.gameOver = true;
      return;
    }

    if (this.snake.eat(this.food)) {
      this.score.points++;
      this.placeNewFood();
      this.drawEatEffect();
    }

    this.drawEntities();
  }

  handleKeyPress(key: string): void {
    if (this.gameOver) {
      this.newGame();
      return;
    }

    if (key === "p") {
      this.paused = !this.paused;
      return;
    }

    if (this.paused) return;

    switch (key) {
      case this.p.UP_ARROW:
      case "k":
        this.inputQueue.push(this.moves.up);
        break;
      case this.p.DOWN_ARROW:
      case "j":
        this.inputQueue.push(this.moves.down);
        break;
      case this.p.LEFT_ARROW:
      case "h":
        this.inputQueue.push(this.moves.left);
        break;
      case this.p.RIGHT_ARROW:
      case "l":
        this.inputQueue.push(this.moves.right);
        break;
    }
  }

  private build(): { grid: Grid; snake: Snake; food: Food; score: Score } {
    const gridColour: Rgb = [
      GRID_COLOUR[0] + Math.random() * 20 - 10,
      GRID_COLOUR[1] + Math.random() * 20 - 10,
      GRID_COLOUR[2] + Math.random() * 20 - 10,
    ];

    const grid = new Grid(this.p, this.canvasWidth, this.canvasHeight, gridColour, BLOCK_WIDTH);

    const startBlock = grid.safeBlocks[0];
    if (!startBlock) {
      throw new Error("The window is too small to fit a playable grid.");
    }

    const snake = new Snake(this.p, startBlock.x, startBlock.y, BLOCK_WIDTH, SNAKE_COLOUR);
    const food = new Food(this.p, BLOCK_WIDTH, FOOD_COLOUR);

    const yLength = Math.floor(this.canvasHeight / BLOCK_WIDTH);
    const yOffset = (this.canvasHeight - yLength * BLOCK_WIDTH) / 2;

    const score = new Score(
      this.p,
      BLOCK_WIDTH,
      Math.max(BLOCK_WIDTH, yOffset - BLOCK_WIDTH / 4),
      BLOCK_WIDTH / 1.5,
    );

    return { grid, snake, food, score };
  }

  private frameRate(): number {
    return Math.max(MIN_FRAME_RATE, Math.floor((this.canvasWidth + this.canvasHeight) / 150));
  }

  private entities(): Drawable[] {
    return [this.grid, this.food, this.snake, this.score];
  }

  private drawEntities(): void {
    this.entities().forEach((entity) => entity.draw());
  }

  private drawBackground(): void {
    this.p.fill(...BACKGROUND_COLOUR);
    this.p.rect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawPaused(): void {
    this.drawEntities();
    this.p.push();

    this.p.fill(0, 0, 0, 80);
    this.p.rect(0, 0, this.canvasWidth, this.canvasHeight);

    this.p.stroke(255, 255, 255);
    this.p.strokeWeight(3);
    this.p.fill(255, 255, 255);
    this.p.textSize(50);
    this.p.textStyle(this.p.BOLD);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text("PAUSED", this.canvasWidth / 2, this.canvasHeight / 2);

    this.p.pop();
  }

  private drawGameOver(): void {
    this.drawEntities();
    this.p.push();

    this.p.fill(0, 0, 0, 150);
    this.p.rect(0, 0, this.canvasWidth, this.canvasHeight);

    this.p.fill(255, 255, 255);
    this.p.textSize(60);
    this.p.textStyle(this.p.BOLD);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text("GAME OVER", this.canvasWidth / 2, this.canvasHeight / 2 - 50);

    this.p.textSize(30);
    this.p.textStyle(this.p.NORMAL);
    this.p.text(`Score: ${this.score.points}`, this.canvasWidth / 2, this.canvasHeight / 2 + 20);

    this.p.textSize(20);
    this.p.fill(200, 200, 200);
    this.p.text("Press any key to restart", this.canvasWidth / 2, this.canvasHeight / 2 + 70);

    this.p.pop();
  }

  private drawEatEffect(): void {
    this.p.push();
    this.p.fill(255, 255, 255, 100);
    this.p.noStroke();
    this.p.circle(this.food.x + BLOCK_WIDTH / 2, this.food.y + BLOCK_WIDTH / 2, BLOCK_WIDTH * 2);
    this.p.pop();
  }

  private placeNewFood(): void {
    const block = this.findUnoccupiedSafeBlock();
    if (!block) return;

    this.food.place(block.x, block.y);
  }

  private findUnoccupiedSafeBlock(): Block | undefined {
    const occupied = this.snake.occupiedKeys();
    const candidates = this.grid.safeBlocks.filter((block) => !occupied.has(pointKey(block)));

    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}
