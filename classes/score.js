class Score {
  constructor(x, y, size, colour) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.colour = colour;
    this.points = 0;
  }

  draw() {
    fill(this.colour);
    textSize(this.size);
    textStyle(BOLD);
    text(`Score: ${this.points}`, this.x, this.y);
  }
}
