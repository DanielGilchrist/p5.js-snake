class Game {
  constructor() {
    this.BLOCK_WIDTH = 35;
    this.GRID_COLOUR = [207, 181, 242];
    this.SNAKE_COLOUR = [117, 232, 116];
    this.FOOD_COLOUR = [230, 80, 90];
    this.canvasWidth = windowWidth - 20;
    this.canvasHeight = windowHeight - 20;
    this.grid;
    this.snake;
    this.food;
    this.score;
    this.gridColour;
    this.inputQueue = [];
    this.paused = false;

    createCanvas(this.canvasWidth, this.canvasHeight);
    const fr = parseInt((this.canvasWidth + this.canvasHeight) / 100);
    console.log(`Frame Rate: ${fr}`);
    frameRate(fr);
    this.newGame();
  }

  newGame() {
    this.gridColour = [Math.random() * 130, Math.random() * 130, Math.random() * 130];
    this.grid = new Grid(
      this.canvasWidth,
      this.canvasHeight,
      this.gridColour,
      this.BLOCK_WIDTH
    );

    this.snake = new Snake(
      this.grid.safeBlocks[0].x,
      this.grid.safeBlocks[0].y,
      this.BLOCK_WIDTH,
      this.SNAKE_COLOUR
    );

    this.food = new Food(this.BLOCK_WIDTH, this.FOOD_COLOUR);
    this.food.place(this.grid);

    this.score = new Score(
      this.BLOCK_WIDTH,
      this.BLOCK_WIDTH - (this.BLOCK_WIDTH / 7),
      this.BLOCK_WIDTH / 1.5,
      0
    );
  }

  drawPaused() {
    fill([220, 220, 220]);
    textSize(50);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("PAUSED", this.canvasWidth / 2, this.canvasHeight / 2);
  }

  update() {
    if (this.paused) return this.drawPaused();

    // update snakes direction from the input queue
    this.inputQueue.length > 0 && this.inputQueue.shift().call();

    this.snake.update();

    this.grid.update(this.snake);

    if (this.snake.isDead(this.grid)) {
      window.alert("GAME OVER\nClick 'OK' to restart");
      this.newGame();
    }

    if (this.snake.eat(this.food)) {
      this.score.points++;
      this.food.place(this.grid);
    }

    [
      this.grid,
      this.food,
      this.snake,
      this.score,
    ].forEach(object => object.draw());
  }

  handleKeyPress(keyCode) {
    if (keyCode === 80) {
      this.paused = !this.paused;
      return;
    }

    if (this.paused) {
      return;
    }

    switch (keyCode) {
      case UP_ARROW:
        this.inputQueue.push(() => this.snake.up());
        break;
      case DOWN_ARROW:
        this.inputQueue.push(() => this.snake.down());
        break;
      case LEFT_ARROW:
        this.inputQueue.push(() => this.snake.left());
        break;
      case RIGHT_ARROW:
        this.inputQueue.push(() => this.snake.right());
        break;
    }
  }
}
