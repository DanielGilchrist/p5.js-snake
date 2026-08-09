import type p5 from "p5";

import * as Assert from "../core/assert";
import type * as Board from "../core/board";
import * as Paint from "./paint";
import * as Palette from "./palette";

const explain = (error: Board.Error): string => {
  switch (error.kind) {
    case "too-small":
      return `Window too small to play (${error.given.cols}x${error.given.rows})`;
    default:
      return Assert.never(error.kind);
  }
};

export const draw = (p: p5, error: Board.Error): void => {
  p.background(Palette.BACKGROUND.red, Palette.BACKGROUND.green, Palette.BACKGROUND.blue);
  Paint.fill(p, Palette.TEXT);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(20);
  p.text(explain(error), p.width / 2, p.height / 2);
};
