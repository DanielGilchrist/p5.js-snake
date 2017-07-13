// constants
//const CANVAS_WIDTH = 900; 
//const CANVAS_HEIGHT = 600;
const BLOCK_WIDTH = 25;
const GRID_COLOUR = [207, 181, 242];
const SNAKE_COLOUR = [117, 232, 116];
const FOOD_COLOUR = [230, 80, 90];

// window size definitions
var CANVAS_WIDTH;
var CANVAS_HEIGHT;

// globals
var grid;
var snake;
var food;
var score;
var gridColour;

function setup() {
    CANVAS_WIDTH = windowWidth - 20;
    CANVAS_HEIGHT = windowHeight - 20;

    createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    frameRate(12);

    gridColour = [(Math.random() * 200) + 100, (Math.random() * 130) + 70, (Math.random() * 256) + 130];

    grid = new Grid(CANVAS_WIDTH, CANVAS_HEIGHT, gridColour, BLOCK_WIDTH);

    snake = new Snake(grid.safeBlocks[0].x, grid.safeBlocks[0].y, BLOCK_WIDTH, SNAKE_COLOUR);

    food = new Food(BLOCK_WIDTH, FOOD_COLOUR);
    food.place(grid);

    score = new Score(BLOCK_WIDTH, BLOCK_WIDTH - (BLOCK_WIDTH / 7), BLOCK_WIDTH / 1.5, 0);
}

function draw() {  
    updateGameState();
    grid.draw();
    food.draw();
    snake.draw(grid);
    score.draw();
}

function windowResized() {
    var newWidth = windowWidth - 20;
    var newHeight = windowHeight - 20;

    resizeCanvas(newWidth, newHeight);
    grid = new Grid(newWidth, newHeight, gridColour, BLOCK_WIDTH);
    food.place(grid);
}

function keyPressed() {
    switch (keyCode) {
        case UP_ARROW:
            snake.changeDir(0, -BLOCK_WIDTH);
            break;
        case DOWN_ARROW:
            snake.changeDir(0, BLOCK_WIDTH);
            break;
        case LEFT_ARROW:
            snake.changeDir(-BLOCK_WIDTH, 0);
            break;
        case RIGHT_ARROW:
            snake.changeDir(BLOCK_WIDTH, 0);
            break;
    }
}

function updateGameState() {
    // check if snake ate the food
    if (snake.eat(food)) {
        // update score
        score.points++;

        // spawn food in new location
        food.place(grid);
    }
}