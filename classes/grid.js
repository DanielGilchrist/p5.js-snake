class Grid {
  constructor(width, height, colour, blockWidth) {
    this.width = width;
    this.height = height;
    this.safeColour = colour;
    this.unsafeColour = [174, 177, 183];
    this.blockWidth = blockWidth;
    this.safeBlocks = [];
    this.unsafeBlocks = [];
    this.numBlocksWidth = Math.floor(this.width / this.blockWidth);
    this.numBlocksHeight = Math.floor(this.height / this.blockWidth);

    this._populateArray();
  }

  getUnoccupiedSafeBlock() {
    // "~~" returns the random number as an integer instead of a float
    let validBlock = false;
    let index;

    while (!validBlock) {
      index = ~~(Math.random() * this.safeBlocks.length - 1);
      if (!this.safeBlocks[index].occupied)
        validBlock = true;
    }

    return this.safeBlocks[index];
  }

  update(snake) {
    this.safeBlocks.forEach(safeBlock =>
      safeBlock.occupied = snake.body.some(snakeBlock =>
        (snake.x === safeBlock.x && snake.y === safeBlock.y) ||
        (snakeBlock.x === safeBlock.x && snakeBlock.y === safeBlock.y)));
  }

  draw() {
    noStroke();
    this.safeBlocks.concat(this.unsafeBlocks).forEach(block => block.draw())
  }

  // private
  _populateArray() {
    const numBlocksHorz = Math.floor(this.width / this.blockWidth);
    const numBlocksVert = Math.floor(this.height / this.blockWidth);
    const numBlocksTotal = numBlocksHorz * numBlocksVert;
    let xCount = 0;
    let yCount = 0;

    for (let i = 0; i < numBlocksTotal; i++) {
      if (xCount === numBlocksHorz) {
        xCount = 0;
        yCount++;
      }

      if (yCount === 0 || xCount === 0 || xCount === numBlocksHorz - 1 || yCount === numBlocksVert - 1) {
        this.unsafeBlocks.push(new Block(this.blockWidth * xCount, this.blockWidth * yCount,
          this.blockWidth, this.unsafeColour));
      } else {
        this.safeBlocks.push(new Block(this.blockWidth * xCount, this.blockWidth * yCount,
          this.blockWidth, this.safeColour));
      }

      xCount++;
    }
  }
}
