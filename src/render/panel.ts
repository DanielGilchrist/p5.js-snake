import type p5 from "p5";

import * as Menu from "./menu";
import * as Paint from "./paint";
import type * as Palette from "./palette";
import type * as Units from "./units";

const WASH = Paint.alpha(120);
const PANEL_RADIUS = 0.28;
const CHIP_RADIUS = 0.24;
const TITLE_RATIO = 0.42;
const LABEL_RATIO = 0.34;
const CHIP_RATIO = 0.28;
const CUT = 0.03;
const SHADOW_DROP = 0.1;

const engrave = (
  p: p5,
  scheme: Palette.Scheme,
  text: string,
  at: Units.Point,
  block: Units.Px,
): void => {
  const cut = Math.max(1, block * CUT);

  Paint.fillWith(p, scheme.markEdge, Paint.alpha(scheme.relief));
  p.text(text, at.x, at.y + cut);

  Paint.fill(p, scheme.mark);
  p.text(text, at.x, at.y);
};

export const draw = (
  p: p5,
  scheme: Palette.Scheme,
  menu: Menu.Menu,
  block: Units.Px,
  cursor: number,
): void => {
  const { panel } = menu;

  p.push();
  p.noStroke();

  Paint.fillWith(p, scheme.shadow, WASH);
  p.rect(0, 0, p.width, p.height);

  Paint.fillWith(p, scheme.shadow, Paint.alpha(70));
  p.rect(
    panel.left,
    panel.top + block * SHADOW_DROP,
    panel.width,
    panel.height,
    block * PANEL_RADIUS,
  );

  Paint.fill(p, scheme.body);
  p.rect(panel.left, panel.top, panel.width, panel.height, block * PANEL_RADIUS);

  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(block * TITLE_RATIO);
  engrave(p, scheme, "SETTINGS", menu.title, block);

  menu.lines.forEach((line, index) => {
    p.textAlign(p.LEFT, p.CENTER);
    p.textSize(block * LABEL_RATIO);
    engrave(p, scheme, line.label, line.at, block);

    for (const chip of line.chips) {
      const middle = chip.at.top + chip.at.height / 2;

      Paint.fillWith(p, scheme.shadow, Paint.alpha(chip.active ? 26 : 46));
      p.rect(chip.at.left, chip.at.top, chip.at.width, chip.at.height, block * CHIP_RADIUS);

      if (chip.active) {
        Paint.fill(p, scheme.wall);
        p.rect(
          chip.at.left,
          chip.at.top - block * SHADOW_DROP * 0.4,
          chip.at.width,
          chip.at.height,
          block * CHIP_RADIUS,
        );
      }

      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(block * CHIP_RATIO);
      engrave(
        p,
        scheme,
        Menu.captionOf(chip.choice),
        { x: (chip.at.left + chip.at.width / 2) as Units.Px, y: middle as Units.Px },
        block,
      );
    }

    if (index !== cursor) return;

    Paint.fillWith(p, scheme.mark, Paint.alpha(150));
    p.circle(line.at.x - block * 0.34, line.at.y, block * 0.14);
  });

  p.pop();
};
