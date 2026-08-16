import type p5 from "p5";

import * as Geometry from "../core/geometry";
import * as Option from "../core/option";
import * as Clay from "./clay";
import * as Hud from "./hud";
import * as Layout from "./layout";
import * as Paint from "./paint";
import * as Palette from "./palette";
import * as SnakeView from "./snake";
import * as Units from "./units";

export type Heads = {
  readonly shown: number;
  readonly least: number;
  readonly most: number;
};

export const FLAT = "flat";
export const LEADS = "leads";
export const RETURNS = "returns";

export type Mark = typeof FLAT | typeof LEADS | typeof RETURNS;

export type Row = {
  readonly label: string;
  readonly heads: Option.Type<Heads>;
  readonly mark: Mark;
};

export const CREST = "crest";
export const WORDS = "words";

export type Heading =
  | { readonly kind: typeof CREST }
  | { readonly kind: typeof WORDS; readonly text: string };

export type Card = {
  readonly heading: Heading;
  readonly rows: readonly Row[];
  readonly hint: string;
};

export type Step = {
  readonly at: Units.Region;
  readonly by: number;
};

export type Slot = {
  readonly at: Units.Region;
  readonly steps: readonly Step[];
};

export type Screen = {
  readonly block: Units.Px;
  readonly panel: Units.Region;
  readonly crown: Units.Point;
  readonly slots: readonly Slot[];
  readonly hint: Units.Point;
  readonly card: Card;
};

const CARD_WIDE = 11.5;
const CARD_SHARE = 0.92;
const CREST_BAND = 2.6;
const WORDS_BAND = 1.9;
const ROW_HEIGHT = 1.35;
const CARD_FOOT = 0.7;
const HINT_DROP = 1;

const PAD = 0.7;
const ARROW = 0.7;
const HEAD = 0.46;
const HEAD_GAP = 0.1;

const CREST_RATIO = 0.92;
const WORDS_RATIO = 0.46;
const LABEL_RATIO = 0.4;
const ARROW_RATIO = 0.44;
const HINT_RATIO = 0.3;
const OPENS_RATIO = 0.5;

const CARD_RADIUS = 0.36;
const PICK_INSET = 0.08;
const PICK_RADIUS = 0.24;

const WASH = Paint.alpha(150);
const HINT_ALPHA = Paint.alpha(170);
const ARROW_ALPHA = Paint.alpha(90);
const OPENS_ALPHA = Paint.alpha(120);
const EMPTY_ALPHA = Paint.alpha(40);

const bandOf = (heading: Heading): number => (heading.kind === CREST ? CREST_BAND : WORDS_BAND);

const headRoom = (block: Units.Px, most: number): number => most * block * (HEAD + HEAD_GAP);

const stepsFor = (at: Units.Region, block: Units.Px, counted: Option.Type<Heads>): Step[] => {
  if (!counted.some) return [];

  const arrow = block * ARROW;
  const middle = at.top + at.height / 2;
  const right = at.left + at.width - block * PAD;
  const left = right - arrow - headRoom(block, counted.value.most) - arrow;

  const box = (edge: number, by: number): Step => ({
    at: Units.region({ left: edge, top: middle - arrow / 2, width: arrow, height: arrow }),
    by,
  });

  return [box(left, -1), box(right - arrow, 1)];
};

export const of = (stage: Units.Region, card: Card): Screen => {
  const block = Layout.panelBlock(stage);
  const band = bandOf(card.heading);
  const width = Math.min(stage.width * CARD_SHARE, block * CARD_WIDE);
  const height = block * (band + card.rows.length * ROW_HEIGHT + CARD_FOOT);
  const left = stage.left + (stage.width - width) / 2;
  const top = stage.top + (stage.height - height) / 2;

  const slots = card.rows.map((row, index) => {
    const at = Units.region({
      left,
      top: top + block * (band + index * ROW_HEIGHT),
      width,
      height: block * ROW_HEIGHT,
    });

    return { at, steps: stepsFor(at, block, row.heads) };
  });

  return {
    block,
    panel: Units.region({ left, top, width, height }),
    crown: Units.point(left + width / 2, top + block * band * 0.52),
    slots,
    hint: Units.point(left + width / 2, top + height + block * HINT_DROP),
    card,
  };
};

const within = (box: Units.Region, at: Units.Point): boolean =>
  at.x >= box.left &&
  at.x <= box.left + box.width &&
  at.y >= box.top &&
  at.y <= box.top + box.height;

export const hit = (screen: Screen, at: Units.Point): Option.Type<number> => {
  for (const [index, slot] of screen.slots.entries()) {
    if (within(slot.at, at)) return Option.some(index);
  }

  return Option.none;
};

export type Nudge = {
  readonly row: number;
  readonly by: number;
};

export const nudged = (screen: Screen, at: Units.Point): Option.Type<Nudge> => {
  for (const [index, slot] of screen.slots.entries()) {
    for (const step of slot.steps) {
      if (within(step.at, at)) return Option.some({ row: index, by: step.by });
    }
  }

  return Option.none;
};

export const covers = (screen: Screen, at: Units.Point): boolean => within(screen.panel, at);

const crest = (p: p5, scheme: Palette.Scheme, screen: Screen): void => {
  const block = screen.block;
  const size = block * CREST_RATIO;
  const label = "SNAKE";

  p.textAlign(p.LEFT, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(size);

  const crown = size * 0.92;
  const gap = size * 0.3;
  const group = crown + gap + p.textWidth(label);
  const start = screen.crown.x - group / 2;

  SnakeView.head(
    p,
    scheme,
    Units.point(start + crown / 2, screen.crown.y),
    crown,
    Palette.bodyFor(scheme, 0),
    Geometry.RIGHT,
    SnakeView.ALIVE,
  );

  Hud.engrave(p, scheme, label, start + crown + gap, screen.crown.y, block);
};

const heading = (p: p5, scheme: Palette.Scheme, screen: Screen): void => {
  const mark = screen.card.heading;

  if (mark.kind === CREST) {
    crest(p, scheme, screen);

    return;
  }

  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(screen.block * WORDS_RATIO);
  Hud.engrave(p, scheme, mark.text, screen.crown.x, screen.crown.y, screen.block);
};

const seats = (
  p: p5,
  scheme: Palette.Scheme,
  counted: Heads,
  slot: Slot,
  block: Units.Px,
): void => {
  const crown = block * HEAD;
  const step = crown + block * HEAD_GAP;
  const middle = slot.at.top + slot.at.height / 2;
  const arrow = block * ARROW;
  const start = slot.at.left + slot.at.width - block * PAD - arrow - headRoom(block, counted.most);

  for (let seat = 0; seat < counted.most; seat++) {
    const at = Units.point(start + seat * step + crown / 2, middle);

    if (seat < counted.shown) {
      SnakeView.head(
        p,
        scheme,
        at,
        crown,
        Palette.bodyFor(scheme, seat),
        Geometry.RIGHT,
        SnakeView.ALIVE,
      );

      continue;
    }

    p.noFill();
    Paint.strokeWith(p, scheme.mark, EMPTY_ALPHA);
    p.strokeWeight(Math.max(1, crown * 0.07));
    p.circle(at.x, at.y, crown * 0.5);
    p.noStroke();
  }
};

const stuck = (counted: Heads, by: number): boolean =>
  by < 0 ? counted.shown <= counted.least : counted.shown >= counted.most;

const arrows = (
  p: p5,
  scheme: Palette.Scheme,
  counted: Heads,
  slot: Slot,
  block: Units.Px,
  lit: boolean,
): void => {
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(block * ARROW_RATIO);

  for (const step of slot.steps) {
    if (stuck(counted, step.by)) continue;

    const middle = Units.point(step.at.left + step.at.width / 2, step.at.top + step.at.height / 2);

    if (lit) Paint.fill(p, scheme.mark);
    else Paint.fillWith(p, scheme.mark, ARROW_ALPHA);

    p.text(step.by < 0 ? "←" : "→", middle.x, middle.y);
  }
};

const rowOf = (
  p: p5,
  scheme: Palette.Scheme,
  screen: Screen,
  index: number,
  cursor: number,
): void => {
  const block = screen.block;
  const slot = screen.slots[index];
  const row = screen.card.rows[index];

  if (slot === undefined || row === undefined) return;

  const middle = slot.at.top + slot.at.height / 2;
  const chosen = index === cursor;

  if (chosen) {
    const inset = slot.at.height * PICK_INSET;

    Paint.fill(p, scheme.wall);
    p.rect(
      slot.at.left + block * PAD * 0.4,
      slot.at.top + inset,
      slot.at.width - block * PAD * 0.8,
      slot.at.height - inset * 2,
      block * PICK_RADIUS,
    );
  }

  const indent = row.mark === RETURNS ? PAD * 1.8 : PAD;

  p.textAlign(p.LEFT, p.CENTER);
  p.textStyle(p.BOLD);
  p.textSize(block * LABEL_RATIO);
  Hud.engrave(p, scheme, row.label, slot.at.left + block * indent, middle, block);

  if (row.mark !== FLAT) {
    const leading = row.mark === LEADS;

    p.textAlign(leading ? p.RIGHT : p.LEFT, p.CENTER);
    p.textSize(block * OPENS_RATIO);
    Paint.fillWith(p, scheme.mark, chosen ? Paint.OPAQUE : OPENS_ALPHA);
    p.text(
      leading ? "›" : "‹",
      leading ? slot.at.left + slot.at.width - block * PAD : slot.at.left + block * PAD * 0.9,
      middle,
    );
  }

  if (!row.heads.some) return;

  seats(p, scheme, row.heads.value, slot, block);
  arrows(p, scheme, row.heads.value, slot, block, chosen);
};

export const draw = (p: p5, scheme: Palette.Scheme, screen: Screen, cursor: number): void => {
  const { block, panel } = screen;

  p.push();
  p.noStroke();

  Paint.fillWith(p, scheme.shadow, WASH);
  p.rect(0, 0, p.width, p.height);

  Clay.cast(p, Clay.RAISED, scheme.shadow, () => {
    Paint.fill(p, scheme.body);
    p.rect(panel.left, panel.top, panel.width, panel.height, block * CARD_RADIUS);
  });

  heading(p, scheme, screen);

  for (const index of screen.slots.keys()) rowOf(p, scheme, screen, index, cursor);

  p.textAlign(p.CENTER, p.CENTER);
  p.textStyle(p.NORMAL);
  p.textSize(block * HINT_RATIO);
  Paint.fillWith(p, scheme.mark, HINT_ALPHA);
  p.text(screen.card.hint, screen.hint.x, screen.hint.y);

  p.pop();
};
