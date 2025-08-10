class Grid {
  constructor(width, height, colour, blockWidth) {
    this.width = width;
    this.height = height;
    this.safeColour = colour;
    this.unsafeColour = [30, 35, 45];
    this.blockWidth = blockWidth;
    this.safeBlocks = [];
    this.unsafeBlocks = [];

    this._populateGrid();
  }

  update() {}

  draw() {
    noStroke();
    this.safeBlocks.concat(this.unsafeBlocks).forEach(block => block.draw());
  }

  // private
  _populateGrid() {
    const xLength = Math.floor(this.width / this.blockWidth);
    const yLength = Math.floor(this.height / this.blockWidth);

    const gridWidth = xLength * this.blockWidth;
    const gridHeight = yLength * this.blockWidth;

    const xOffset = (this.width - gridWidth) / 2;
    const yOffset = (this.height - gridHeight) / 2;

    const isUnsafeBlock = (xCount, yCount, xLength, yLength) =>
      xCount === 0           ||
      yCount === 0           ||
      xCount === xLength - 1 ||
      yCount === yLength - 1;

    for (let yCount = 0; yCount < yLength; yCount++) {
      for (let xCount = 0; xCount < xLength; xCount++) {
        const blockX = this.blockWidth * xCount + xOffset;
        const blockY = this.blockWidth * yCount + yOffset;

        if (isUnsafeBlock(xCount, yCount, xLength, yLength)) {
          this.unsafeBlocks.push(new Block(blockX, blockY, this.blockWidth, this.unsafeColour));
        } else {
          this.safeBlocks.push(new Block(blockX, blockY, this.blockWidth, this.safeColour));
        }
      }
    }
  }
}
