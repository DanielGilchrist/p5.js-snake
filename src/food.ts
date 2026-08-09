import type p5 from "p5";

import { Block } from "./block";
import type { Rgb } from "./types";

export class Food extends Block {
  private readonly pulseOffset: number;

  constructor(p: p5, width: number, colour: Rgb) {
    super(p, -50, -50, width, colour);
    this.pulseOffset = p.random(p.TWO_PI);
  }

  place(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  override draw(): void {
    const pulseScale = 1 + this.p.sin(this.p.millis() * 0.01 + this.pulseOffset) * 0.05;
    const foodSize = this.width * 0.8 * pulseScale;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.width / 2;

    this.p.push();

    const cornerRadius = foodSize * 0.15;
    const context = this.p.drawingContext;

    if (context instanceof CanvasRenderingContext2D) {
      const gradient = context.createLinearGradient(
        centerX - foodSize / 2,
        centerY - foodSize / 2,
        centerX + foodSize / 2,
        centerY + foodSize / 2,
      );

      const [red, green, blue] = this.colour;
      gradient.addColorStop(0, `rgba(${red + 60}, ${green + 30}, ${blue + 30}, 1)`);
      gradient.addColorStop(1, `rgba(${red - 30}, ${green - 15}, ${blue - 15}, 1)`);

      context.fillStyle = gradient;
    }

    this.p.stroke(this.colour[0] + 40, this.colour[1] + 20, this.colour[2] + 20);
    this.p.strokeWeight(2);
    this.p.rect(centerX - foodSize / 2, centerY - foodSize / 2, foodSize, foodSize, cornerRadius);

    this.p.fill(255, 255, 255, 60);
    this.p.noStroke();
    const highlightSize = foodSize * 0.3;
    this.p.rect(
      centerX - foodSize / 2 + highlightSize * 0.3,
      centerY - foodSize / 2 + highlightSize * 0.3,
      highlightSize,
      highlightSize,
      cornerRadius * 0.5,
    );

    this.p.pop();
  }
}
