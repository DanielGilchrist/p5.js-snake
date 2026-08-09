import type p5 from "p5";

import type { Food } from "./food";
import type { Grid } from "./grid";
import { pointKey, type Drawable, type Point, type Rgb } from "./types";

type EyePositions = readonly [
  xEyeLeft: number,
  xEyeRight: number,
  yEyeLeft: number,
  yEyeRight: number,
];

export class Snake implements Point, Drawable {
  private readonly eyeSize: number;
  private readonly eyePosFacing: number;
  private readonly eyePosLeft: number;
  private readonly eyePosRight: number;

  private xdir: number;
  private ydir = 0;
  private body: Point[] = [];
  private dead = false;

  size: number;

  constructor(
    private readonly p: p5,
    public x: number,
    public y: number,
    private readonly width: number,
    private readonly colour: Rgb,
    initialSize = 1,
  ) {
    this.size = initialSize;
    this.xdir = width;

    this.eyeSize = width / 5;
    this.eyePosFacing = width / 2;
    this.eyePosLeft = width / 4;
    this.eyePosRight = width / 1.25;
  }

  occupiedKeys(): Set<string> {
    return new Set(this.body.map(pointKey));
  }

  eat(food: Food): boolean {
    if (this.x !== food.x || this.y !== food.y) return false;

    this.size++;
    return true;
  }

  isDead(grid: Grid): boolean {
    const collided = this.body
      .concat(grid.unsafeBlocks)
      .some((block) => this.p.dist(this.x, this.y, block.x, block.y) < 1);

    if (collided) this.dead = true;

    return collided;
  }

  up(): void {
    if (this.size === 0 || (this.xdir !== 0 && this.ydir === 0)) this.changeDir(0, -this.width);
  }

  down(): void {
    if (this.size === 0 || (this.xdir !== 0 && this.ydir === 0)) this.changeDir(0, this.width);
  }

  left(): void {
    if (this.size === 0 || (this.xdir === 0 && this.ydir !== 0)) this.changeDir(-this.width, 0);
  }

  right(): void {
    if (this.size === 0 || (this.xdir === 0 && this.ydir !== 0)) this.changeDir(this.width, 0);
  }

  update(): void {
    for (let i = 0; i < this.body.length - 1; i++) {
      const next = this.body[i + 1];
      if (next) this.body[i] = next;
    }

    if (this.size >= this.body.length) {
      this.body[this.size - 1] = { x: this.x, y: this.y };
    }

    this.x += this.xdir;
    this.y += this.ydir;
  }

  draw(): void {
    this.drawBody();
    this.drawHead();
    this.drawEyes();
  }

  private changeDir(xdir: number, ydir: number): void {
    this.xdir = xdir;
    this.ydir = ydir;
  }

  private isFacingUp(): boolean {
    return this.xdir === 0 && this.ydir < 0;
  }

  private isFacingDown(): boolean {
    return this.xdir === 0 && this.ydir > 0;
  }

  private isFacingLeft(): boolean {
    return this.xdir < 0 && this.ydir === 0;
  }

  private eyePositions(): EyePositions {
    const eyeOffset = this.width * 0.15;

    if (this.isFacingUp()) {
      return [
        this.eyePosLeft,
        this.eyePosRight,
        this.eyePosFacing - eyeOffset,
        this.eyePosFacing - eyeOffset,
      ];
    }

    if (this.isFacingDown()) {
      return [
        this.eyePosLeft,
        this.eyePosRight,
        this.eyePosFacing + eyeOffset,
        this.eyePosFacing + eyeOffset,
      ];
    }

    if (this.isFacingLeft()) {
      return [
        this.eyePosFacing - eyeOffset,
        this.eyePosFacing - eyeOffset,
        this.eyePosLeft,
        this.eyePosRight,
      ];
    }

    return [
      this.eyePosFacing + eyeOffset,
      this.eyePosFacing + eyeOffset,
      this.eyePosLeft,
      this.eyePosRight,
    ];
  }

  private drawBody(): void {
    const [red, green, blue] = this.colour;

    this.body.forEach((block, index) => {
      const segmentAlpha = this.p.map(index, 0, Math.max(this.body.length - 1, 1), 0.7, 0.9);

      this.p.fill(red, green, blue, segmentAlpha * 255);
      this.p.stroke(red + 40, green + 40, blue + 40);
      this.p.strokeWeight(1);

      const cornerRadius = this.width * 0.2;
      this.p.rect(block.x + 1, block.y + 1, this.width - 2, this.width - 2, cornerRadius);
    });
  }

  private drawHead(): void {
    const [red, green, blue] = this.colour;

    this.p.fill(red + 20, green + 20, blue + 20);
    this.p.stroke(red + 50, green + 50, blue + 50);
    this.p.strokeWeight(2);

    const headSize = this.width - 2;
    const cornerRadius = this.width * 0.3;

    this.p.rect(this.x + 1, this.y + 1, headSize, headSize, cornerRadius);
  }

  private drawEyes(): void {
    const [xEyeLeft, xEyeRight, yEyeLeft, yEyeRight] = this.eyePositions();
    const eyeSize = this.dead ? this.eyeSize * 1.8 : this.eyeSize * 0.7;

    if (this.dead) {
      this.drawDeadEye(this.x + xEyeLeft, this.y + yEyeLeft, eyeSize);
      this.drawDeadEye(this.x + xEyeRight, this.y + yEyeRight, eyeSize);
      return;
    }

    this.p.fill(0, 0, 0);
    this.p.noStroke();
    this.p.circle(this.x + xEyeLeft, this.y + yEyeLeft, eyeSize);
    this.p.circle(this.x + xEyeRight, this.y + yEyeRight, eyeSize);
  }

  private drawDeadEye(centerX: number, centerY: number, eyeSize: number): void {
    this.p.stroke(0, 0, 0);
    this.p.strokeWeight(2);

    const size = eyeSize * 0.5;

    this.p.line(centerX - size / 2, centerY - size / 2, centerX + size / 2, centerY + size / 2);
    this.p.line(centerX + size / 2, centerY - size / 2, centerX - size / 2, centerY + size / 2);
  }
}
