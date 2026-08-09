import type p5 from "p5";

import * as Paint from "./paint";
import * as Palette from "./palette";

const LABEL = "ENTER";
const TRAILING = "to skip";

const TEXT_SIZE = 13;
const CAP_HEIGHT = 26;
const CAP_RADIUS = 6;
const CAP_PADDING = 10;
const CAP_GAP = 8;

const CAP_FILL = Paint.alpha(26);
const LABEL_ALPHA = Paint.alpha(230);
const TRAILING_ALPHA = Paint.alpha(150);

export const draw = (p: p5): void => {
  p.push();
  p.textSize(TEXT_SIZE);
  p.textAlign(p.LEFT, p.CENTER);

  p.textStyle(p.BOLD);
  const capWidth = p.textWidth(LABEL) + CAP_PADDING * 2;

  p.textStyle(p.NORMAL);
  const trailingWidth = p.textWidth(TRAILING);

  const left = p.width / 2 - (capWidth + CAP_GAP + trailingWidth) / 2;
  const middle = p.height / 2;
  const top = middle - CAP_HEIGHT / 2;

  p.noStroke();
  Paint.fillWith(p, Palette.PAPER, CAP_FILL);
  p.rect(left, top, capWidth, CAP_HEIGHT, CAP_RADIUS);

  p.noFill();
  Paint.stroke(p, Palette.TEXT);
  p.strokeWeight(1);
  p.rect(left + 0.5, top + 0.5, capWidth - 1, CAP_HEIGHT - 1, CAP_RADIUS);

  p.noStroke();
  p.textStyle(p.BOLD);
  Paint.fillWith(p, Palette.PAPER, LABEL_ALPHA);
  p.text(LABEL, left + CAP_PADDING, middle);

  p.textStyle(p.NORMAL);
  Paint.fillWith(p, Palette.TEXT, TRAILING_ALPHA);
  p.text(TRAILING, left + capWidth + CAP_GAP, middle);
  p.pop();
};
