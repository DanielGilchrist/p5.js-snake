import p5 from "p5";

import { withBoard, type Board, type BoardApi } from "./core/board";
import { newGame, step } from "./core/game";
import { commandFor, parseKey } from "./core/input";
import { rng } from "./core/rng";
import { layoutFor } from "./render/layout";
import { render, renderBoardError } from "./render/render";
import { px, type Viewport } from "./render/units";

const BLOCK_WIDTH = px(35);
const MIN_FRAME_RATE = 10;

export const sketch = new p5((p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight).parent(document.body);
    p.frameRate(Math.max(MIN_FRAME_RATE, Math.floor((p.windowWidth + p.windowHeight) / 150)));

    const viewport: Viewport = { width: px(p.windowWidth), height: px(p.windowHeight) };

    const started = withBoard(
      { cols: viewport.width / BLOCK_WIDTH, rows: viewport.height / BLOCK_WIDTH },
      <B>(board: Board<B>, api: BoardApi<B>): void => {
        const layout = layoutFor(board, viewport, BLOCK_WIDTH);
        let state = newGame(board, rng(Date.now()));

        p.draw = () => {
          state = step(api, state, { kind: "tick" }).state;
          render(p, state, layout);
        };

        p.keyPressed = () => {
          const command = commandFor(state, parseKey(p.key));
          if (!command.some) return;

          state = step(api, state, command.value).state;
        };
      },
    );

    if (!started.ok) {
      const { error } = started;
      p.draw = () => renderBoardError(p, error);
    }
  };
});
