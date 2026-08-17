import type p5 from "p5";

import * as Assert from "../core/assert";
import * as Board from "../core/board";
import * as Paint from "./paint";
import type * as Palette from "./palette";

const explain = (error: Board.Error): string => {
  switch (error.kind) {
    case Board.TOO_SMALL:
      return `Window too small to play (${error.given.cols}x${error.given.rows})`;
    default:
      return Assert.never(error.kind);
  }
};

export const draw = (p: p5, scheme: Palette.Scheme, error: Board.Error): void => {
  p.background(scheme.background.red, scheme.background.green, scheme.background.blue);
  Paint.fill(p, scheme.text);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(20);
  p.text(explain(error), p.width / 2, p.height / 2);
};
