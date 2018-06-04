let game;

function setup() {
  game = new Game();
}

function draw() {
  game.update();
}

function keyPressed() {
  game.handleKeyPress(keyCode);
}
