class Score {
  constructor(x, y, size, colour) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.colour = colour;
    this.points = 0;
  }

  draw() {
    push();

    textAlign(LEFT, BASELINE);
    textSize(this.size);
    textStyle(BOLD);

    const scoreText = `Score: ${this.points}`;

    stroke(0, 0, 0);
    strokeWeight(1);
    fill(220, 220, 220);
    text(scoreText, this.x, this.y);

    pop();
  }
}
