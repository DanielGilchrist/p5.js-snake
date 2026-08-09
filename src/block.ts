import type p5 from "p5";

import type { Drawable, Point, Rgb } from "./types";

export class Block implements Point, Drawable {
  constructor(
    protected readonly p: p5,
    public x: number,
    public y: number,
    public readonly width: number,
    public readonly colour: Rgb,
  ) {}

  draw(): void {
    this.p.fill(...this.colour);
    this.p.noStroke();
    this.p.rect(this.x, this.y, this.width, this.width);
  }
}
