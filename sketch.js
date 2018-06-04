// constants
const BLOCK_WIDTH = 25;
const GRID_COLOUR = [207, 181, 242];
const SNAKE_COLOUR = [117, 232, 116];
const FOOD_COLOUR = [230, 80, 90];

// window size definitions
let canvasWidth;
let canvasHeight;

// globals
let grid;
let snake;
let food;
let score;
let gridColour;
let inputQueue;

function setup() {
  canvasWidth = windowWidth - 20;
  canvasHeight = windowHeight - 20;

  createCanvas(canvasWidth, canvasHeight);
  frameRate(12);

  inputQueue = [];

  newGame();
}

function draw() {
  updateGameState();
  grid.draw();
  food.draw();
  snake.draw();
  score.draw();
}

function keyPressed() {
  switch (keyCode) {
    case UP_ARROW:
      inputQueue.push(() => snake.up());
      break;
    case DOWN_ARROW:
      inputQueue.push(() => snake.down());
      break;
    case LEFT_ARROW:
      inputQueue.push(() => snake.left());
      break;
    case RIGHT_ARROW:
      inputQueue.push(() => snake.right());
      break;
    case 80: // 'p'
      window.alert("Paused\nPress the 'OK' button to continue");
      break;
  }
}

function updateGameState() {
  // update snakes direction from queue
  inputQueue.length > 0 && inputQueue.shift().call();

  // update snake
  snake.update();

  // update the grid
  grid.update(snake);

  // check if the snake is dead
  if (snake.isDead(grid)) {
    window.alert("GAME OVER\nClick 'OK' to restart");
    newGame();
  }

  // check if snake ate the food
  if (snake.eat(food)) {
    // update score
    score.points++;

    // spawn food in new location
    food.place(grid);
  }
}

function random_grid_colour() {
  return [Math.random() * 130, Math.random() * 130, Math.random() * 130];
}

function newGame() {
  gridColour = random_grid_colour();

  grid = new Grid(canvasWidth, canvasHeight, gridColour, BLOCK_WIDTH);

  snake = new Snake(grid.safeBlocks[0].x, grid.safeBlocks[0].y, BLOCK_WIDTH, SNAKE_COLOUR);

  food = new Food(BLOCK_WIDTH, FOOD_COLOUR);
  food.place(grid);

  score = new Score(BLOCK_WIDTH, BLOCK_WIDTH - (BLOCK_WIDTH / 7), BLOCK_WIDTH / 1.5, 0);
}
