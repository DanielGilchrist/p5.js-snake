import p5 from "p5";
import { Game } from "./game";

export const sketch = new p5((p: p5) => {
  p.setup = () => {
    const game = new Game(p);

    p.draw = () => game.update();
    p.keyPressed = () => game.handleKeyPress(p.key);
  };
});
