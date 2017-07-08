class Snake {
    constructor(x, y, width, colour, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.colour = colour;
        // keep snake aligned with grid using width
        this.xdir = width;
        this.ydir = 0;
        this.body = [];
    }

    changeDir(xdir, ydir) {
        this.xdir = xdir;
        this.ydir = ydir;
    }

    intersects(block) {
        return (this.x == block.x && this.y == block.y);
    }

    // grid object is passed in to constrain the snake to the grid
    draw(grid) {
        this.x += this.xdir;
        this.y += this.ydir;

        this.x = constrain(this.x, this.width, grid.getGridWidth() - (this.width * 2));
        this.y = constrain(this.y, this.width, grid.getGridHeight() - (this.width * 2));

        fill(this.colour);
        rect(this.x, this.y, this.width, this.width);
    }
}