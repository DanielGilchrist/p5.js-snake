class Snake {
    constructor(x, y, width, colour) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.colour = colour;
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
        if (this.x === food.x && this.y === food.y) {
            this.size++;
            return true;
        } else {
            return false;
        }
    }

    isDead(grid) {
        // checks if the snake has tried to eat itself
        for (var i = 0; i < this.body.length; i++) {
            if (dist(this.x, this.y, this.body[i].x, this.body[i].y) < 1) {
                return true;
            } 
        }

        // checks if the snake goes onto an unsafe block
        for (var i = 0; i < grid.unsafeBlocks.length; i++) {
            if (dist(this.x, this.y, grid.unsafeBlocks[i].x, grid.unsafeBlocks[i].y) < 1) {
                return true;
            }
        }

        return false;
    }

    update() {
        for (var i = 0; i < this.body.length - 1; i++) {
            this.body[i] = this.body[i + 1];
        }
        
        if (this.size >= 1) {
            this.body[this.size - 1] = createVector(this.x, this.y);
        }

        this.x += this.xdir;
        this.y += this.ydir;
    }

    draw() {
        fill(this.colour);
        this.body.forEach(function(block) {
            rect(block.x, block.y, this.width, this.width);
        }, this);
        rect(this.x, this.y, this.width, this.width);
    }
}