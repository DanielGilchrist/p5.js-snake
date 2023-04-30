let game;
let startTouchX, startTouchY;
let endTouchX, endTouchY;
let swipeThreshold = 30;

function setup () {
  game = new Game();
}

function draw () {
  game.update();
}

function keyPressed () {
  game.handleKeyPress(keyCode);
}

function touchStarted () {
  startTouchX = mouseX;
  startTouchY = mouseY;
}

function touchMoved () {
  endTouchX = mouseX;
  endTouchY = mouseY;
}

function touchEnded () {
  var dx = endTouchX - startTouchX;
  var dy = endTouchY - startTouchY;

  if (_hasSwiped(dx, dy)) {
    game.handleTouchSwipe(dx, dy)
  }
}

function _hasSwiped (dx, dy) {
  return abs(dx) > swipeThreshold || abs(dy) > swipeThreshold
}
