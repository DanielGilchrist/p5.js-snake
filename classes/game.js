class Game {
  constructor() {
    this.BLOCK_WIDTH = 25;
    this.GRID_COLOUR = [207, 181, 242];
    this.SNAKE_COLOUR = [117, 232, 116];
    this.FOOD_COLOUR = [230, 80, 90]
    this.canvasWidth = windowWidth - 20;
    this.canvasHeight = windowHeight - 20;
    this.grid;
    this.snake;
    this.food;
    this.score;
    this.gridColour;
    this.inputQueue = [];

    createCanvas(this.canvasWidth, this.canvasHeight);
    frameRate(12);
    this.newGame();
  }

  newGame() {
    this.gridColour = [Math.random() * 130, Math.random() * 130, Math.random() * 130];
    this.grid = new Grid(this.canvasWidth, this.canvasHeight, this.gridColour, this.BLOCK_WIDTH);
    this.snake = new Snake(this.grid.safeBlocks[0].x, this.grid.safeBlocks[0].y, this.BLOCK_WIDTH, this.SNAKE_COLOUR);
    this.food = new Food(this.BLOCK_WIDTH, this.FOOD_COLOUR);
    this.food.place(this.grid);
    this.score = new Score(this.BLOCK_WIDTH, this.BLOCK_WIDTH - (this.BLOCK_WIDTH / 7), this.BLOCK_WIDTH / 1.5, 0);
  }

  update() {
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
    ].forEach(object => object.draw())
  }

  handleKeyPress(keyCode) {
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
      case 80: // 'p'
        // TODO: Fix issue where game would continue if user switches to a different window
        window.alert("Paused\nPress the 'OK' button to continue");
        break;
    }
  }
}
