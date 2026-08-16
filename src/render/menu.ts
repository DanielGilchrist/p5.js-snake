import * as Assert from "../core/assert";
import * as Option from "../core/option";
import * as Settings from "./settings";
import * as Units from "./units";

export const THEME = "theme";
export const HAND = "hand";

export type Row = typeof THEME | typeof HAND;

export const ROWS: readonly Row[] = [THEME, HAND];

export type Chip = {
  readonly at: Units.Region;
  readonly choice: Settings.Choice;
  readonly active: boolean;
};

export type Line = {
  readonly row: Row;
  readonly label: string;
  readonly at: Units.Point;
  readonly chips: readonly Chip[];
};

export type Menu = {
  readonly panel: Units.Region;
  readonly lines: readonly Line[];
  readonly title: Units.Point;
};

const PANEL_WIDE = 11.5;
const PANEL_PAD = 0.9;
const ROW_HEIGHT = 1.5;
const TITLE_HEIGHT = 1.6;
const CHIP_GAP = 0.16;
const CHIP_HEIGHT = 0.9;

const labelOf = (row: Row): string => {
  switch (row) {
    case THEME:
      return "Theme";
    case HAND:
      return "Controls";
    default:
      return Assert.never(row);
  }
};

const choicesFor = (row: Row): readonly Settings.Choice[] => {
  switch (row) {
    case THEME:
      return Settings.THEMES.map((value) => ({ kind: Settings.THEME, value }));
    case HAND:
      return Settings.HANDS.map((value) => ({ kind: Settings.HAND, value }));
    default:
      return Assert.never(row);
  }
};

export const captionOf = (choice: Settings.Choice): string => {
  switch (choice.kind) {
    case THEME:
      return Settings.themeLabel(choice.value);
    case HAND:
      return Settings.handLabel(choice.value);
    default:
      return Assert.never(choice);
  }
};

const isActive = (choice: Settings.Choice, settings: Settings.Type): boolean => {
  switch (choice.kind) {
    case THEME:
      return settings.theme === choice.value;
    case HAND:
      return settings.hand === choice.value;
    default:
      return Assert.never(choice);
  }
};

export const of = (
  stage: Units.Region,
  block: Units.Px,
  settings: Settings.Type,
  rows: readonly Row[],
): Menu => {
  const width = Math.min(stage.width * 0.9, block * PANEL_WIDE);
  const height = block * (TITLE_HEIGHT + rows.length * ROW_HEIGHT + PANEL_PAD);
  const left = stage.left + (stage.width - width) / 2;
  const top = stage.top + (stage.height - height) / 2;

  const panel = Units.region({ left, top, width, height });
  const chipWidth = (width / 2 - block * PANEL_PAD) / 3 - block * CHIP_GAP;
  const chipHeight = block * CHIP_HEIGHT;

  const lines = rows.map((row, index) => {
    const middle = top + block * TITLE_HEIGHT + block * ROW_HEIGHT * (index + 0.5);
    const choices = choicesFor(row);
    const span = chipWidth * choices.length + block * CHIP_GAP * (choices.length - 1);
    const start = left + width - block * PANEL_PAD - span;

    return {
      row,
      label: labelOf(row),
      at: Units.point(left + block * PANEL_PAD, middle),
      chips: choices.map((choice, slot) => ({
        at: Units.region({
          left: start + slot * (chipWidth + block * CHIP_GAP),
          top: middle - chipHeight / 2,
          width: chipWidth,
          height: chipHeight,
        }),
        choice,
        active: isActive(choice, settings),
      })),
    };
  });

  return { panel, lines, title: Units.point(left + width / 2, top + block * TITLE_HEIGHT * 0.55) };
};

const within = (box: Units.Region, at: Units.Point): boolean =>
  at.x >= box.left &&
  at.x <= box.left + box.width &&
  at.y >= box.top &&
  at.y <= box.top + box.height;

export const hit = (menu: Menu, at: Units.Point): Option.Type<Settings.Choice> => {
  for (const line of menu.lines) {
    for (const chip of line.chips) {
      if (within(chip.at, at)) return Option.some(chip.choice);
    }
  }

  return Option.none;
};

export const covers = (menu: Menu, at: Units.Point): boolean => within(menu.panel, at);

export const cycle = (settings: Settings.Type, row: Row, step: number): Settings.Type => {
  switch (row) {
    case THEME:
      return Settings.cycleTheme(settings, step);
    case HAND:
      return Settings.cycleHand(settings, step);
    default:
      return Assert.never(row);
  }
};

export const rowsFor = (handheld: boolean): readonly Row[] => (handheld ? ROWS : ["theme"]);

export const nextCursor = (menu: Menu, cursor: number, by: number): number => {
  const count = menu.lines.length;

  if (count === 0) return 0;

  return (((cursor + by) % count) + count) % count;
};

export const rowAt = (menu: Menu, cursor: number): Row => {
  const count = menu.lines.length;
  const line = menu.lines[((cursor % count) + count) % count];

  return line === undefined ? "theme" : line.row;
};
