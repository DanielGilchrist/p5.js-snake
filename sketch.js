// constants
const BLOCK_WIDTH = 25;
const GRID_COLOUR = [207, 181, 242];
const SNAKE_COLOUR = [117, 232, 116];
const FOOD_COLOUR = [230, 80, 90];

// window size definitions
var canvasWidth;
var canvasHeight;

// globals
var grid;
var snake;
var food;
var score;
var gridColour;

function setup() {
    canvasWidth = windowWidth - 20;
    canvasHeight = windowHeight - 20;

    createCanvas(canvasWidth, canvasHeight);
    frameRate(12);

    reset();
}

function draw() {  
    updateGameState();
    grid.draw();
    food.draw();
    snake.draw();
    score.draw();
}

/*function windowResized() {
    var newWidth = windowWidth - 20;
    var newHeight = windowHeight - 20;

    resizeCanvas(newWidth, newHeight);
    grid = new Grid(newWidth, newHeight, gridColour, BLOCK_WIDTH);
    food.place(grid);
}*/

function keyPressed() {
    switch (keyCode) {
        case UP_ARROW:
            if (snake.size === 0 || (snake.xdir !== 0 && snake.ydir === 0)) {
                snake.changeDir(0, -BLOCK_WIDTH);
            }
            break;
        case DOWN_ARROW:
            if (snake.size === 0 || (snake.xdir !== 0 && snake.ydir === 0)) {
                snake.changeDir(0, BLOCK_WIDTH);
            }
            break;
        case LEFT_ARROW:
            if (snake.size === 0 || (snake.xdir === 0 && snake.ydir !== 0)) {
                snake.changeDir(-BLOCK_WIDTH, 0);
            }
            break;
        case RIGHT_ARROW:
            if (snake.size === 0 || (snake.xdir === 0 && snake.ydir !== 0)) {
                snake.changeDir(BLOCK_WIDTH, 0);
            }
            break;
        case 80: // 'p'
            window.alert("Paused\nPress the 'OK' button to continue");
            break;
    }
}

function updateGameState() {
    // update snake
    snake.update();

    // change blocks occupied
    grid.safeBlocks.forEach(function(gridBlock) {
        var alreadyChecked = false;
        if (snake.x === gridBlock.x && snake.y === gridBlock.y) {
            gridBlock.occupied = true;
        } else if (snake.size > 0) {
            snake.body.forEach(function(snakeBlock) {
                if (snakeBlock.x === gridBlock.x && snakeBlock.y === gridBlock.y) {
                    gridBlock.occupied = true;
                    alreadyChecked = true;
                } else if (!alreadyChecked) {
                    gridBlock.occupied = false;
                }
            }, this);
        }
    }, this);

    // check if the snake is dead
    if (snake.isDead(grid)) {
        window.alert("GAME OVER\nClick 'OK' to restart");
        reset();
    }

    // check if snake ate the food
    if (snake.eat(food)) {
        // update score
        score.points++;

        // spawn food in new location
        food.place(grid);
    }
}

function reset() {
    gridColour = [(Math.random() * 200) + 100, (Math.random() * 130) + 70, (Math.random() * 256) + 130];

    grid = new Grid(canvasWidth, canvasHeight, gridColour, BLOCK_WIDTH);

    snake = new Snake(grid.safeBlocks[0].x, grid.safeBlocks[0].y, BLOCK_WIDTH, SNAKE_COLOUR);

    food = new Food(BLOCK_WIDTH, FOOD_COLOUR);
    food.place(grid);

    score = new Score(BLOCK_WIDTH, BLOCK_WIDTH - (BLOCK_WIDTH / 7), BLOCK_WIDTH / 1.5, 0);
}