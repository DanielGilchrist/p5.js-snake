class Snake {
    constructor(x, y, width, colour) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.colour = colour;
        // keep snake aligned with grid using width
        this.xdir = width;
        this.ydir = 0;
        this.size = 0;
        this.body = [];
    }

    changeDir(xdir, ydir) {
        this.xdir = xdir;
        this.ydir = ydir;
    }

    eat(food) {
        if (this.x == food.x && this.y == food.y) {
            this.size++;
            return true;
        } else {
            return false;
        }
    }

    update() {
        for (var i = 0; i < this.body.length - 1; i++) {
            this.body[i] = this.body[i + 1];
        }
        
        if (this.size >= 1) {
            this.body[this.size - 1] = createVector(this.x, this.y);
        }
    }

    // grid object is passed in to constrain the snake to the grid
    draw(grid) {
        this.update();

        this.x += this.xdir;
        this.y += this.ydir;

        this.x = constrain(this.x, this.width, grid.getGridWidth() - (this.width * 2));
        this.y = constrain(this.y, this.width, grid.getGridHeight() - (this.width * 2));

        fill(this.colour);
        this.body.forEach(function(block) {
            rect(block.x, block.y, this.width, this.width);
        }, this);
        rect(this.x, this.y, this.width, this.width);
    }
}