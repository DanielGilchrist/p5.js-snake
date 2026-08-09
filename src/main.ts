import p5 from "p5";

import * as Board from "./core/board";
import * as Game from "./core/game";
import * as Input from "./core/input";
import * as Rng from "./core/rng";
import * as Layout from "./render/layout";
import * as Render from "./render/render";
import * as Units from "./render/units";

const BLOCK_WIDTH = Units.px(35);
const MIN_FRAME_RATE = 10;

export const sketch = new p5((p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight).parent(document.body);
    p.frameRate(Math.max(MIN_FRAME_RATE, Math.floor((p.windowWidth + p.windowHeight) / 150)));

    const viewport: Units.Viewport = {
      width: Units.px(p.windowWidth),
      height: Units.px(p.windowHeight),
    };

    const started = Board.withBoard(
      { cols: viewport.width / BLOCK_WIDTH, rows: viewport.height / BLOCK_WIDTH },
      <B>(board: Board.Grid<B>, api: Board.Api<B>): void => {
        const layout = Layout.layoutFor(board, viewport, BLOCK_WIDTH);
        let state = Game.newGame(board, Rng.fromSeed(Date.now()));

        p.draw = () => {
          state = Game.step(api, state, { kind: "tick" }).state;
          Render.render(p, state, layout);
        };

        p.keyPressed = () => {
          const command = Input.commandFor(state, Input.parseKey(p.key));
          if (!command.some) return;

          state = Game.step(api, state, command.value).state;
        };
      },
    );

    if (!started.ok) {
      const { error } = started;
      p.draw = () => Render.renderBoardError(p, error);
    }
  };
});
