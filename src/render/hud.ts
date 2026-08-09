import type p5 from "p5";

import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as Units from "./units";

export type Line = { readonly text: string; readonly size: Units.Px };

const SCORE_GAP = 8;
const LINE_GAP = 20;
const FIRST_LINE_OFFSET = -50;

export const score = (p: p5, points: number, layout: Layout.Metrics): void => {
  p.push();
  p.textAlign(p.LEFT, p.BASELINE);
  p.textSize(layout.blockWidth / 1.5);
  p.textStyle(p.BOLD);
  Paint.stroke(p, Palette.INK);
  p.strokeWeight(1);
  Paint.fill(p, Palette.TEXT);
  p.text(
    `Score: ${points}`,
    layout.blockWidth,
    Math.max(layout.blockWidth, layout.origin.y - SCORE_GAP),
  );
  p.pop();
};

export const banner = (p: p5, lines: readonly Line[], scrim: Paint.Alpha): void => {
  p.push();
  Paint.fillWith(p, Palette.INK, scrim);
  p.rect(0, 0, p.width, p.height);
  Paint.fill(p, Palette.PAPER);
  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);

  let offset = FIRST_LINE_OFFSET;

  for (const line of lines) {
    p.textSize(line.size);
    p.text(line.text, p.width / 2, p.height / 2 + offset);
    offset += line.size + LINE_GAP;
  }

  p.pop();
};
