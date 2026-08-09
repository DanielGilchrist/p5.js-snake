import type p5 from "p5";

import * as Assert from "../core/assert";
import * as Paint from "./paint";
import * as Palette from "./palette";
import type * as Scene from "./scene";

const TRAILING = "to skip";

const labelFor = (prompt: Scene.Prompt): string => {
  switch (prompt) {
    case "keys":
      return "ENTER";
    case "touch":
      return "TAP";
    default:
      return Assert.never(prompt);
  }
};

const TEXT_SIZE = 13;
const CAP_HEIGHT = 26;
const CAP_RADIUS = 6;
const CAP_PADDING = 10;
const CAP_GAP = 8;

const CAP_FILL = Paint.alpha(210);
const LABEL_ALPHA = Paint.alpha(245);
const TRAILING_ALPHA = Paint.alpha(210);

export const draw = (p: p5, scheme: Palette.Scheme, prompt: Scene.Prompt): void => {
  const LABEL = labelFor(prompt);

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
  Paint.fillWith(p, scheme.shadow, CAP_FILL);
  p.rect(left, top, capWidth, CAP_HEIGHT, CAP_RADIUS);

  p.noStroke();
  p.textStyle(p.BOLD);
  Paint.fillWith(p, scheme.paper, LABEL_ALPHA);
  p.text(LABEL, left + CAP_PADDING, middle);

  p.textStyle(p.NORMAL);
  Paint.fillWith(p, scheme.text, TRAILING_ALPHA);
  p.text(TRAILING, left + capWidth + CAP_GAP, middle);
  p.pop();
};
