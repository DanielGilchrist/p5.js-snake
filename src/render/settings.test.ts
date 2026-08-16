import { describe, expect, test } from "bun:test";

import * as Layout from "./layout";
import * as Menu from "./menu";
import * as Palette from "./palette";
import * as Settings from "./settings";
import * as Units from "./units";

const STAGE = Units.region({ left: 0, top: 0, width: 900, height: 600 });
const BLOCK = Units.px(44);

describe("settings", () => {
  test("auto follows the system, the rest override it", () => {
    const auto: Settings.Type = { theme: "auto", hand: "right" };

    expect(Settings.schemeFor(auto, false)).toBe(Palette.EARTHENWARE);
    expect(Settings.schemeFor(auto, true)).toBe(Palette.STONEWARE);

    for (const nightly of [false, true]) {
      expect(Settings.schemeFor({ ...auto, theme: "earthenware" }, nightly)).toBe(
        Palette.EARTHENWARE,
      );
      expect(Settings.schemeFor({ ...auto, theme: "stoneware" }, nightly)).toBe(Palette.STONEWARE);
    }
  });

  test("cycling a setting wraps and never leaves the known values", () => {
    let settings = Settings.DEFAULT;

    for (let i = 0; i < Settings.THEMES.length * 2; i++) {
      settings = Settings.cycleTheme(settings, 1);
      expect(Settings.THEMES).toContain(settings.theme);
    }

    expect(settings.theme).toBe(Settings.DEFAULT.theme);

    for (let i = 0; i < Settings.HANDS.length * 3; i++) {
      settings = Settings.cycleHand(settings, -1);
      expect(Settings.HANDS).toContain(settings.hand);
    }
  });

  test("choosing a value changes only that setting", () => {
    const start: Settings.Type = { theme: "auto", hand: "right" };
    const dark = Settings.chosen(start, { kind: "theme", value: "stoneware" });

    expect(dark.theme).toBe("stoneware");
    expect(dark.hand).toBe(start.hand);

    const lefty = Settings.chosen(dark, { kind: "hand", value: "left" });

    expect(lefty.hand).toBe("left");
    expect(lefty.theme).toBe(dark.theme);
  });

  test("settings survive a round trip through storage", () => {
    for (const theme of Settings.THEMES) {
      for (const hand of Settings.HANDS) {
        const settings: Settings.Type = { theme, hand };

        expect(Settings.decode(Settings.encode(settings))).toEqual(settings);
      }
    }
  });

  test("garbage in storage falls back to the defaults", () => {
    expect(Settings.decode("")).toEqual(Settings.DEFAULT);
    expect(Settings.decode("purple:sideways")).toEqual(Settings.DEFAULT);
    expect(Settings.decode("stoneware:sideways").theme).toBe("stoneware");
  });
});

describe("menu", () => {
  test("tapping a chip picks exactly that value", () => {
    const menu = Menu.of(STAGE, BLOCK, Settings.DEFAULT, Menu.ROWS);

    for (const line of menu.lines) {
      for (const chip of line.chips) {
        const middle = Units.point(
          chip.at.left + chip.at.width / 2,
          chip.at.top + chip.at.height / 2,
        );
        const picked = Menu.hit(menu, middle);

        expect(picked.some).toBe(true);
        if (picked.some) expect(picked.value).toEqual({ kind: Menu.CHOSEN, choice: chip.choice });
      }
    }
  });

  test("every setting is reachable and exactly one chip is active per row", () => {
    const menu = Menu.of(STAGE, BLOCK, Settings.DEFAULT, Menu.ROWS);

    expect(menu.lines.length).toBe(Menu.ROWS.length);

    for (const line of menu.lines) {
      expect(line.chips.filter((chip) => chip.active).length).toBe(1);
    }
  });

  test("chips never overlap each other", () => {
    const menu = Menu.of(STAGE, BLOCK, Settings.DEFAULT, Menu.ROWS);
    const all = menu.lines.flatMap((line) => line.chips);

    for (const a of all) {
      for (const b of all) {
        if (a === b) continue;

        const apart =
          a.at.left + a.at.width <= b.at.left + 1e-9 ||
          b.at.left + b.at.width <= a.at.left + 1e-9 ||
          a.at.top + a.at.height <= b.at.top + 1e-9 ||
          b.at.top + b.at.height <= a.at.top + 1e-9;

        expect(apart).toBe(true);
      }
    }
  });

  test("the panel stays inside the play area", () => {
    const menu = Menu.of(STAGE, BLOCK, Settings.DEFAULT, Menu.ROWS);

    expect(menu.panel.left).toBeGreaterThanOrEqual(STAGE.left);
    expect(menu.panel.top).toBeGreaterThanOrEqual(STAGE.top);
    expect(menu.panel.left + menu.panel.width).toBeLessThanOrEqual(STAGE.left + STAGE.width);
    expect(menu.panel.top + menu.panel.height).toBeLessThanOrEqual(STAGE.top + STAGE.height);

    for (const chip of menu.lines.flatMap((line) => line.chips)) {
      expect(chip.at.left).toBeGreaterThanOrEqual(menu.panel.left);
      expect(chip.at.left + chip.at.width).toBeLessThanOrEqual(menu.panel.left + menu.panel.width);
    }
  });

  test("a tap outside every chip picks nothing", () => {
    const menu = Menu.of(STAGE, BLOCK, Settings.DEFAULT, Menu.ROWS);

    expect(Menu.hit(menu, Units.point(STAGE.left + 2, STAGE.top + 2)).some).toBe(false);
    expect(Menu.covers(menu, Units.point(STAGE.left + 2, STAGE.top + 2))).toBe(false);
    expect(Menu.covers(menu, Units.point(menu.panel.left + 4, menu.panel.top + 4))).toBe(true);
  });

  test("keyboard cycling matches what the chips offer", () => {
    for (const row of Menu.ROWS) {
      const next = Menu.cycle(Settings.DEFAULT, row, 1);
      const back = Menu.cycle(next, row, -1);

      expect(back).toEqual(Settings.DEFAULT);
    }

    const menu = Menu.of(STAGE, BLOCK, Settings.DEFAULT, Menu.ROWS);
    const [first] = Menu.ROWS;
    const last = Menu.ROWS[Menu.ROWS.length - 1];

    expect(Menu.rowAt(menu, 0)).toBe(first ?? "theme");
    expect(Menu.rowAt(menu, Menu.ROWS.length)).toBe(first ?? "theme");
    expect(Menu.rowAt(menu, -1)).toBe(last ?? "hand");
  });

  test("a keyboard shell is not offered the touch-only rows", () => {
    const desk = Menu.rowsFor(false, Menu.ON_TITLE);
    const handheld = Menu.rowsFor(true, Menu.ON_TITLE);

    expect(desk).toEqual([Menu.THEME]);
    expect(handheld).toEqual([...Menu.ROWS, Menu.FULL]);
    expect(Menu.of(STAGE, BLOCK, Settings.DEFAULT, desk).lines.length).toBe(1);
  });

  test("the in-game menu adds the actions the title screen does not need", () => {
    expect(Menu.rowsFor(false, Menu.IN_GAME)).toEqual([Menu.THEME, Menu.HOW, Menu.HOME]);
    expect(Menu.rowsFor(false, Menu.ON_TITLE)).toEqual([Menu.THEME]);
  });

  test("only a touch shell is offered fullscreen, and it is offered on both screens", () => {
    expect(Menu.rowsFor(true, Menu.ON_TITLE)).toContain(Menu.FULL);
    expect(Menu.rowsFor(true, Menu.IN_GAME)).toContain(Menu.FULL);
    expect(Menu.rowsFor(false, Menu.IN_GAME)).not.toContain(Menu.FULL);
  });

  test("tapping anywhere along an action row picks that action", () => {
    const menu = Menu.of(STAGE, BLOCK, Settings.DEFAULT, Menu.rowsFor(false, Menu.IN_GAME));
    const action = menu.lines.find((line) => line.row === Menu.HOME);

    expect(action).toBeDefined();

    if (action === undefined) return;

    for (const share of [0.1, 0.5, 0.9]) {
      const picked = Menu.hit(
        menu,
        Units.point(action.reach.left + action.reach.width * share, action.at.y),
      );

      expect(picked.some).toBe(true);
      if (picked.some) expect(picked.value).toEqual({ kind: Menu.ACTED, row: Menu.HOME });
    }
  });

  test("cycling an action row leaves the settings alone", () => {
    expect(Menu.cycle(Settings.DEFAULT, Menu.HOME, 1)).toEqual(Settings.DEFAULT);
    expect(Menu.cycle(Settings.DEFAULT, Menu.HOW, -1)).toEqual(Settings.DEFAULT);
  });

  test("the panel scales with the board", () => {
    const small = Menu.of(STAGE, Units.px(24), Settings.DEFAULT, Menu.ROWS);
    const large = Menu.of(STAGE, Units.px(60), Settings.DEFAULT, Menu.ROWS);

    expect(large.panel.height).toBeGreaterThan(small.panel.height);
  });
});

describe("layout still fits the menu", () => {
  test("a phone-sized stage still holds the panel", () => {
    const stage = Units.region({ left: 18, top: 18, width: 346, height: 519 });
    const menu = Menu.of(stage, Units.px(28), Settings.DEFAULT, Menu.ROWS);

    expect(menu.panel.width).toBeLessThanOrEqual(stage.width);
    expect(menu.panel.height).toBeLessThanOrEqual(stage.height);
    expect(Layout.desk(Units.viewport(390, 844)).width).toBeGreaterThan(0);
  });
});

describe("walking the settings cursor", () => {
  const menu = Menu.of(
    Units.region({ left: 0, top: 0, width: 800, height: 600 }),
    Units.px(30),
    Settings.DEFAULT,
    Menu.rowsFor(false, Menu.IN_GAME),
  );

  test("it always lands on a real row", () => {
    let cursor = 0;

    for (let i = 0; i < menu.lines.length * 3; i++) {
      cursor = Menu.nextCursor(menu, cursor, 1);

      expect(cursor).toBeGreaterThanOrEqual(0);
      expect(cursor).toBeLessThan(menu.lines.length);
    }
  });

  test("it wraps around both ends", () => {
    expect(Menu.nextCursor(menu, menu.lines.length - 1, 1)).toBe(0);
    expect(Menu.nextCursor(menu, 0, -1)).toBe(menu.lines.length - 1);
  });
});
