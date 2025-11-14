class Game {
  constructor() {
    this.BLOCK_WIDTH = 35;
    this.GRID_COLOUR = [45, 55, 75];
    this.SNAKE_COLOUR = [76, 175, 80];
    this.FOOD_COLOUR = [244, 67, 54];
    this.canvasWidth = windowWidth;
    this.canvasHeight = windowHeight;
    this.grid;
    this.snake;
    this.food;
    this.score;
    this.gridColour;
    this.inputQueue = [];
    this.paused = false;
    this.gameOver = false;

    this.SNAKE_MOVES = {
      UP:    () => this.snake.up(),
      DOWN:  () => this.snake.down(),
      LEFT:  () => this.snake.left(),
      RIGHT: () => this.snake.right(),
    }

    const canvas = createCanvas(this.canvasWidth, this.canvasHeight);
    canvas.parent(document.body);

    let fr = parseInt((this.canvasWidth + this.canvasHeight) / 150);

    if (fr < 10) {
      fr = 10
    }

    console.log(`Frame Rate: ${fr}`);

    frameRate(fr);
    this.newGame();
  }

  newGame() {
    this.gameOver = false;
    this.gridColour = [
      this.GRID_COLOUR[0] + Math.random() * 20 - 10,
      this.GRID_COLOUR[1] + Math.random() * 20 - 10,
      this.GRID_COLOUR[2] + Math.random() * 20 - 10
    ];
    this.grid = new Grid(
      this.canvasWidth,
      this.canvasHeight,
      this.gridColour,
      this.BLOCK_WIDTH
    );

    const safeBlock = this.grid.safeBlocks[0];
    this.snake = new Snake(
      safeBlock.x,
      safeBlock.y,
      this.BLOCK_WIDTH,
      this.SNAKE_COLOUR
    );

    this.food = new Food(this.BLOCK_WIDTH, this.FOOD_COLOUR);
    this._placeNewFood();

    const yLength = Math.floor(this.canvasHeight / this.BLOCK_WIDTH);
    const gridHeight = yLength * this.BLOCK_WIDTH;
    const yOffset = (this.canvasHeight - gridHeight) / 2;

    this.score = new Score(
      this.BLOCK_WIDTH,
      Math.max(this.BLOCK_WIDTH, yOffset - this.BLOCK_WIDTH / 4),
      this.BLOCK_WIDTH / 1.5,
      0
    );
  }

  drawPaused() {
    [
      this.grid,
      this.food,
      this.snake,
      this.score,
    ].forEach(object => object.draw());

    push();

    fill(0, 0, 0, 80);
    rect(0, 0, this.canvasWidth, this.canvasHeight);

    stroke(255, 255, 255);
    strokeWeight(3);
    fill(255, 255, 255);
    textSize(50);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("PAUSED", this.canvasWidth / 2, this.canvasHeight / 2);

    pop();
  }

  update() {
    this.drawBackground();

    if (this.paused) return this.drawPaused();
    if (this.gameOver) return this.drawGameOver();

    // update snakes direction from the input queue
    this.inputQueue.length > 0 && this.inputQueue.shift().call();

    this.snake.update();

    this.grid.update();

    if (this.snake.isDead(this.grid)) {
      if (!this.gameOver) {
        this.gameOver = true;
        return;
      }
    }

    if (this.snake.eat(this.food)) {
      this.score.points++;
      this._placeNewFood();
      this.drawEatEffect();
    }

    [
      this.grid,
      this.food,
      this.snake,
      this.score,
    ].forEach(object => object.draw());
  }

  drawBackground() {
    fill(30, 35, 45);
    rect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  drawEatEffect() {
    push();
    fill(255, 255, 255, 100);
    noStroke();
    const effectSize = this.BLOCK_WIDTH * 2;
    circle(this.food.x + this.BLOCK_WIDTH/2, this.food.y + this.BLOCK_WIDTH/2, effectSize);
    pop();
  }

  drawGameOver() {
    [
      this.grid,
      this.food,
      this.snake,
      this.score,
    ].forEach(object => object.draw());

    push();

    fill(0, 0, 0, 150);
    rect(0, 0, this.canvasWidth, this.canvasHeight);

    fill(255, 255, 255);
    textSize(60);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("GAME OVER", this.canvasWidth / 2, this.canvasHeight / 2 - 50);

    textSize(30);
    textStyle(NORMAL);
    text(`Score: ${this.score.points}`, this.canvasWidth / 2, this.canvasHeight / 2 + 20);

    textSize(20);
    fill(200, 200, 200);
    text("Press any key or touch to restart", this.canvasWidth / 2, this.canvasHeight / 2 + 70);

    pop();
  }

  handleDoubleTap () {
    if (this.gameOver) {
      this.newGame();
      return;
    }
    this._togglePaused();
  }

  handleSingleTap() {
    if (this.gameOver) {
      this.newGame();
      return;
    }
  }

  handleKeyPress(key) {
    if (this.gameOver) {
      this.newGame();
      return;
    }

    if (key === "p") {
      this._togglePaused();
      return;
    }

    if (this.paused) {
      return;
    }

    switch (key) {
      case UP_ARROW:
      case "k":
        this._queueMove(this.SNAKE_MOVES.UP);
        break;
      case DOWN_ARROW:
      case "j":
        this._queueMove(this.SNAKE_MOVES.DOWN);
        break;
      case LEFT_ARROW:
      case "h":
        this._queueMove(this.SNAKE_MOVES.LEFT);
        break;
      case RIGHT_ARROW:
      case "l":
        this._queueMove(this.SNAKE_MOVES.RIGHT);
        break;
    }
  }

  handleTouchSwipe (dx, dy) {
    if (this.gameOver) {
      this.newGame();
      return;
    }

    if (this.paused) {
      return;
    }

    const move =
      (abs(dx) > abs(dy))
        ? dx > 0
          ? this.SNAKE_MOVES.RIGHT : this.SNAKE_MOVES.LEFT
        : dy > 0
          ? this.SNAKE_MOVES.DOWN : this.SNAKE_MOVES.UP;

    this._queueMove(move);
  }

  _queueMove (callback) {
    this.inputQueue.push(callback);
  }

  _togglePaused () {
    this.paused = !this.paused;
  }

  _placeNewFood() {
    const block = this._findUnoccupiedSafeBlock();
    this.food.place(block.x, block.y);
  }

  _findUnoccupiedSafeBlock() {
    const snakeCoords = this.snake.coords();
    const unOccupiedSafeBlocks = this.grid.safeBlocks.filter(block => !snakeCoords[[block.x, block.y]]);

    return unOccupiedSafeBlocks[Math.floor(Math.random() * unOccupiedSafeBlocks.length)];
  }
}
