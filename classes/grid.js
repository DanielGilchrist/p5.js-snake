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

      if (yCount === 0 || xCount === 0 || xCount === numBlocksHorz - 1 || yCount == numBlocksVert - 1) {
        this.unsafeBlocks.push(new Block(this.blockWidth * xCount, this.blockWidth * yCount,
          this.blockWidth, this.unsafeColour));
      } else {
        this.safeBlocks.push(new Block(this.blockWidth * xCount, this.blockWidth * yCount,
          this.blockWidth, this.safeColour));
      }

      xCount++;
    }
  }

  getUnoccupiedSafeBlock() {
    // "~~" returns the random number as an integer instead of a float
    let validBlock = false;
    let index = ~~(Math.random() * this.safeBlocks.length - 1);

    while (!validBlock) {
      if (this.safeBlocks[index].occupied) {
        index = ~~(Math.random() * this.safeBlocks.length - 1);
      } else {
        validBlock = true;
      }
    }

    return this.safeBlocks[index];
  }

  update(snake) {
    // checks if blocks are occupied by the snake and sets them accordingly
    for (let i = 0; i < this.safeBlocks.length; i++) {
      this.safeBlocks[i].occupied = snake.body.some((snakeBlock) => {
        return (snake.x === this.safeBlocks[i].x && snake.y === this.safeBlocks[i].y) ||
          (snakeBlock.x === this.safeBlocks[i].x && snakeBlock.y === this.safeBlocks[i].y);
      }, this);
    }
  }

  draw() {
    noStroke();

    for (let i = 0; i < this.safeBlocks.length; i++) {
      this.safeBlocks[i].draw();
    }

    for (let i = 0; i < this.unsafeBlocks.length; i++) {
      this.unsafeBlocks[i].draw();
    }
  }
}
