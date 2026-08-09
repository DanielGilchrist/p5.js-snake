import type p5 from "p5";

import type { Drawable } from "./types";

export class Score implements Drawable {
  points = 0;

  constructor(
    private readonly p: p5,
    private readonly x: number,
    private readonly y: number,
    private readonly size: number,
  ) {}

  draw(): void {
    this.p.push();

    this.p.textAlign(this.p.LEFT, this.p.BASELINE);
    this.p.textSize(this.size);
    this.p.textStyle(this.p.BOLD);

    this.p.stroke(0, 0, 0);
    this.p.strokeWeight(1);
    this.p.fill(220, 220, 220);
    this.p.text(`Score: ${this.points}`, this.x, this.y);

    this.p.pop();
  }
}
