var BlockType = Object.freeze({SAFE: 0, UNSAFE: 1, SNAKE: 2, });

class Block {
    constructor(x, y, width, colour, type) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.colour = colour;
        this.type = type;
        this.occupied = false;
    }

    draw() {
        fill(this.colour);
        rect(this.x, this.y, this.width, this.width);
    }
}