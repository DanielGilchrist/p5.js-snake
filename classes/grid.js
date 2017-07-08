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
        var numBlocksHorz = Math.floor(this.width / this.blockWidth);
        var numBlocksVert = Math.floor(this.height / this.blockWidth);
        var numBlocksTotal = numBlocksHorz * numBlocksVert;
        var xCount = 0;
        var yCount = 0;

        for (var i = 0; i < numBlocksTotal; i++) {
            if (xCount === numBlocksHorz) {
                xCount = 0;
                yCount++;
            }

            if (yCount === 0 || xCount === 0 || xCount === numBlocksHorz - 1 || yCount == numBlocksVert - 1) {
                this.unsafeBlocks.push(new Block(this.blockWidth * xCount, this.blockWidth * yCount, 
                                                 this.blockWidth, this.unsafeColour, BlockType.UNSAFE));
            } else {
                this.safeBlocks.push(new Block(this.blockWidth * xCount, this.blockWidth * yCount, 
                                               this.blockWidth, this.safeColour, BlockType.SAFE));
            }

            xCount++;
        }
    }

    getGridWidth() {
        return this.numBlocksWidth * this.blockWidth;
    }

    getGridHeight() {
        return this.numBlocksHeight * this.blockWidth;
    }

    getUnoccupiedSafeBlock() {
        // "~~" returns the random number as an integer instead of a float
        var validBlock = false;
        var index = ~~(Math.random() * this.safeBlocks.length - 1);

        while(!validBlock) {
            if (this.safeBlocks[index].occupied) {
                index = ~~(Math.random() * this.safeBlocks.length - 1);
            } else {
                validBlock = true;
            }
        }

        return this.safeBlocks[index];
    }

    changeColour() {
        var randomColour = [(Math.random() * 256) + 130, (Math.random() * 256) + 130, (Math.random() * 256) + 130];
        this.colour = randomColour;
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