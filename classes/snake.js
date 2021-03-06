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
    return (this.x === food.x && this.y === food.y) && ++this.size;
  }

  isDead(grid) {
    return this.body.concat(grid.unsafeBlocks).some(block => dist(this.x, this.y, block.x, block.y) < 1);
  }

  up() {
    (this.size === 0 || (this.xdir !== 0 && this.ydir === 0)) && this.changeDir(0, -this.width);
  }

  down() {
    (this.size === 0 || (this.xdir !== 0 && this.ydir === 0)) && this.changeDir(0, this.width);
  }

  left() {
    (this.size === 0 || (this.xdir === 0 && this.ydir !== 0)) && this.changeDir(-this.width, 0);
  }

  right() {
    (this.size === 0 || (this.xdir === 0 && this.ydir !== 0)) && this.changeDir(this.width, 0);
  }

  update() {
    for (let i = 0; i < this.body.length - 1; i++) {
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
    rect(this.x, this.y, this.width, this.width); // draw the head

    this.body.forEach(block => rect(block.x, block.y, this.width, this.width));
  }
}
