class Snake {
  constructor(x, y, width, colour, initialSize = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.colour = colour;
    this.initialSize = initialSize;

    this.borderRadius = this.width / 2;
    this.xdir = width;
    this.ydir = 0;
    this.size = initialSize;
    this.body = [];
    this.dead = false;
    this.deathTime = 0;

    this.eyeSize      = width / 5;
    this.eyePosFacing = width / 2;
    this.eyePosLeft   = width / 4;
    this.eyePosRight  = width / 1.25;
  }

  coords() {
    return this.body.reduce((coords, block) => {
      coords[[block.x, block.y]] = true;
      return coords;
    }, {});
  }

  changeDir(xdir, ydir) {
    this.xdir = xdir;
    this.ydir = ydir;
  }

  eat(food) {
    return (this.x === food.x && this.y === food.y) && ++this.size;
  }

  isDead(grid) {
    const dead = this.body.concat(grid.unsafeBlocks).some(block => dist(this.x, this.y, block.x, block.y) < 1);
    if (dead && !this.dead) {
      this.dead = true;
      this.deathTime = millis();
    }
    return dead;
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

    if (this.size >= this.body.length) {
      this.body[this.size - 1] = createVector(this.x, this.y);
    }

    this.x += this.xdir;
    this.y += this.ydir;
  }

  isFacingUp() {
    return this.xdir === 0 && this.ydir < 0;
  }

  isFacingDown() {
    return this.xdir === 0 && this.ydir > 0;
  }

  isFacingRight() {
    return this.xdir > 0 && this.ydir === 0;
  }

  isFacingLeft() {
    return this.xdir < 0 && this.ydir === 0;
  }

  getHeadDimensions() {
    return [
      this.isFacingUp()   || this.isFacingLeft()  ? this.borderRadius : 0, // top-left
      this.isFacingUp()   || this.isFacingRight() ? this.borderRadius : 0, // top-right
      this.isFacingDown() || this.isFacingRight() ? this.borderRadius : 0, // bottom-right
      this.isFacingDown() || this.isFacingLeft()  ? this.borderRadius : 0, // bottom-left
    ];
  }

  getEyeDimensions() {
    const eyeOffset = this.width * 0.15;

    if (this.isFacingUp()) {
      return [
        this.eyePosLeft,   // left eye x
        this.eyePosRight,  // right eye x
        this.eyePosFacing - eyeOffset,  // left eye y (closer to front)
        this.eyePosFacing - eyeOffset   // right eye y (closer to front)
      ];
    } else if (this.isFacingDown()) {
      return [
        this.eyePosLeft,
        this.eyePosRight,
        this.eyePosFacing + eyeOffset,
        this.eyePosFacing + eyeOffset
      ];
    } else if (this.isFacingLeft()) {
      return [
        this.eyePosFacing - eyeOffset,  // left eye x (closer to front)
        this.eyePosFacing - eyeOffset,  // right eye x (closer to front)
        this.eyePosLeft,   // left eye y
        this.eyePosRight   // right eye y
      ];
    } else { // facing right
      return [
        this.eyePosFacing + eyeOffset,
        this.eyePosFacing + eyeOffset,
        this.eyePosLeft,
        this.eyePosRight
      ];
    }
  }

  draw() {
    this.drawBody();
    this.drawHead();
    this.drawEyes();
  }

  drawBody() {
    if (this.body.length === 0) return;

    this.body.forEach((block, index) => {
      const segmentAlpha = map(index, 0, Math.max(this.body.length - 1, 1), 0.7, 0.9);
      const segmentColor = [...this.colour, segmentAlpha * 255];

      fill(segmentColor);
      stroke(this.colour[0] + 40, this.colour[1] + 40, this.colour[2] + 40);
      strokeWeight(1);

      const cornerRadius = this.width * 0.2;
      rect(block.x + 1, block.y + 1, this.width - 2, this.width - 2, cornerRadius);
    });
  }

  drawHead() {
    const headDimensions = this.getHeadDimensions();

    fill(this.colour[0] + 20, this.colour[1] + 20, this.colour[2] + 20);
    stroke(this.colour[0] + 50, this.colour[1] + 50, this.colour[2] + 50);
    strokeWeight(2);

    const headSize = this.width - 2;
    const cornerRadius = this.width * 0.3;

    rect(this.x + 1, this.y + 1, headSize, headSize, cornerRadius);
  }

  drawEyes() {
    const [
      xEyeLeft,
      xEyeRight,
      yEyeLeft,
      yEyeRight
    ] = this.getEyeDimensions();

    const eyeSize = this.dead ? this.eyeSize * 1.8 : this.eyeSize * 0.7;

    if (this.dead) {
      this.drawDeadEyes(this.x + xEyeLeft, this.y + yEyeLeft, eyeSize);
      this.drawDeadEyes(this.x + xEyeRight, this.y + yEyeRight, eyeSize);
    } else {
      fill(0, 0, 0);
      noStroke();
      circle(this.x + xEyeLeft, this.y + yEyeLeft, eyeSize);
      circle(this.x + xEyeRight, this.y + yEyeRight, eyeSize);
    }
  }

  drawDeadEyes(centerX, centerY, eyeSize) {
    stroke(0, 0, 0);
    strokeWeight(2);

    const size = eyeSize * 0.5;

    line(centerX - size/2, centerY - size/2, centerX + size/2, centerY + size/2);
    line(centerX + size/2, centerY - size/2, centerX - size/2, centerY + size/2);
  }
}
