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

        while(!validBlock) {
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
        grid.safeBlocks.forEach(function(gridBlock) {
            let isOccupied = false;
            if (snake.x === gridBlock.x && snake.y === gridBlock.y) {
                gridBlock.occupied = true;
            } else if (snake.size > 0) {
                // uses some instead of forEach to break early if block is occupied
                snake.body.some(function(snakeBlock) {
                    if (snakeBlock.x === gridBlock.x && snakeBlock.y === gridBlock.y) {
                        gridBlock.occupied = true;
                        isOccupied = true;
                        return true; // break
                    }
                }, this);

                if (!isOccupied) {
                    gridBlock.occupied = false;
                }
            }
        }, this);
    }

    draw() {
        noStroke();

        this.safeBlocks.forEach(function(block) {
            block.draw();
        }, this);

        this.unsafeBlocks.forEach(function(block) {
            block.draw();
        }, this);
    }
}
