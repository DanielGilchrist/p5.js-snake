import type p5 from "p5";

import { Block } from "./block";
import type { Drawable, Rgb } from "./types";

const UNSAFE_COLOUR: Rgb = [30, 35, 45];

export class Grid implements Drawable {
  readonly safeBlocks: Block[] = [];
  readonly unsafeBlocks: Block[] = [];

  constructor(
    private readonly p: p5,
    private readonly width: number,
    private readonly height: number,
    private readonly safeColour: Rgb,
    private readonly blockWidth: number,
  ) {
    this.populate();
  }

  update(): void {}

  draw(): void {
    this.p.noStroke();
    this.safeBlocks.concat(this.unsafeBlocks).forEach((block) => block.draw());
  }

  private populate(): void {
    const xLength = Math.floor(this.width / this.blockWidth);
    const yLength = Math.floor(this.height / this.blockWidth);

    const gridWidth = xLength * this.blockWidth;
    const gridHeight = yLength * this.blockWidth;

    const xOffset = (this.width - gridWidth) / 2;
    const yOffset = (this.height - gridHeight) / 2;

    const isUnsafeBlock = (xCount: number, yCount: number): boolean =>
      xCount === 0 || yCount === 0 || xCount === xLength - 1 || yCount === yLength - 1;

    for (let yCount = 0; yCount < yLength; yCount++) {
      for (let xCount = 0; xCount < xLength; xCount++) {
        const blockX = this.blockWidth * xCount + xOffset;
        const blockY = this.blockWidth * yCount + yOffset;

        if (isUnsafeBlock(xCount, yCount)) {
          this.unsafeBlocks.push(new Block(this.p, blockX, blockY, this.blockWidth, UNSAFE_COLOUR));
        } else {
          this.safeBlocks.push(new Block(this.p, blockX, blockY, this.blockWidth, this.safeColour));
        }
      }
    }
  }
}
