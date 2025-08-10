class Food extends Block {
  constructor(width, colour) {
    super(-50, -50, width, colour);
    this.pulseOffset = random(TWO_PI);
  }

  place(x, y) {
    this.x = x;
    this.y = y;
  }

  draw() {
    const pulseScale = 1 + sin(millis() * 0.01 + this.pulseOffset) * 0.05;
    const foodSize = this.width * 0.8 * pulseScale;
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.width / 2;

    push();

    const gradient = drawingContext.createLinearGradient(
      centerX - foodSize / 2,
      centerY - foodSize / 2,
      centerX + foodSize / 2,
      centerY + foodSize / 2
    );

    gradient.addColorStop(0, `rgba(${this.colour[0] + 60}, ${this.colour[1] + 30}, ${this.colour[2] + 30}, 1)`);
    gradient.addColorStop(1, `rgba(${this.colour[0] - 30}, ${this.colour[1] - 15}, ${this.colour[2] - 15}, 1)`);

    drawingContext.fillStyle = gradient;

    stroke(this.colour[0] + 40, this.colour[1] + 20, this.colour[2] + 20);
    strokeWeight(2);
    const cornerRadius = foodSize * 0.15;
    rect(centerX - foodSize/2, centerY - foodSize/2, foodSize, foodSize, cornerRadius);

    fill(255, 255, 255, 60);
    noStroke();
    const highlightSize = foodSize * 0.3;
    rect(centerX - foodSize/2 + highlightSize * 0.3, centerY - foodSize/2 + highlightSize * 0.3, highlightSize, highlightSize, cornerRadius * 0.5);

    pop();
  }
}
