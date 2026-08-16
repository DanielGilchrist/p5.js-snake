import { describe, expect, test } from "bun:test";

import * as Input from "../core/input";
import * as Intent from "./intent";
import * as Phase from "./phase";

const key = (raw: string): Input.Key => Input.parseKey(raw);

const kindFor = <B>(phase: Phase.Phase<B>, raw: string, suspendable = true): string =>
  Intent.forKey(phase, key(raw), suspendable).kind;

describe("waiting on the ready screen", () => {
  test("any key readies you up", () => {
    for (const raw of ["Enter", "a", "ArrowUp", " "]) {
      expect(kindFor(Phase.READY, raw)).toBe(Intent.READY_UP);
    }
  });

  test("the menu and help keys still do their own thing", () => {
    expect(kindFor(Phase.READY, "S")).toBe(Intent.OPEN_SETTINGS);
    expect(kindFor(Phase.READY, "?")).toBe(Intent.OPEN_HELP);
  });
});

describe("playing", () => {
  test("a steering key is handed to the game", () => {
    expect(kindFor(Phase.LIVE, "ArrowUp")).toBe(Intent.PRESS);
    expect(kindFor(Phase.LIVE, "q")).toBe(Intent.PRESS);
  });

  test("the menu and help keys open their screens", () => {
    expect(kindFor(Phase.LIVE, "S")).toBe(Intent.OPEN_SETTINGS);
    expect(kindFor(Phase.LIVE, "?")).toBe(Intent.OPEN_HELP);
  });

  test("nothing can be suspended in a game that forbids it", () => {
    for (const raw of ["S", "?", "P"]) {
      expect(kindFor(Phase.LIVE, raw, false)).toBe(Intent.NOTHING);
    }
  });

  test("steering still works when pausing is forbidden", () => {
    expect(kindFor(Phase.LIVE, "ArrowLeft", false)).toBe(Intent.PRESS);
  });
});

describe("frozen", () => {
  test("the freeze key freezes and unfreezes", () => {
    expect(kindFor(Phase.LIVE, "P")).toBe(Intent.FREEZE);
    expect(kindFor(Phase.FROZEN, "P")).toBe(Intent.RESUME);
  });

  test("every other key is ignored while frozen", () => {
    for (const raw of ["ArrowUp", "Enter", "S", "?"]) {
      expect(kindFor(Phase.FROZEN, raw)).toBe(Intent.NOTHING);
    }
  });
});

describe("reading the controls", () => {
  test("the menu key steps sideways into settings", () => {
    expect(kindFor(Phase.HELP, "S")).toBe(Intent.OPEN_SETTINGS);
  });

  test("anything else closes it", () => {
    for (const raw of ["Enter", "ArrowUp", "q"]) {
      expect(kindFor(Phase.HELP, raw)).toBe(Intent.RESUME);
    }
  });
});

describe("in the settings", () => {
  const SETTINGS = Phase.settings(0);

  test("up and down walk the cursor", () => {
    expect(Intent.forKey(SETTINGS, key("ArrowUp"), true)).toEqual({
      kind: Intent.MOVE_CURSOR,
      by: -1,
    });
    expect(Intent.forKey(SETTINGS, key("ArrowDown"), true)).toEqual({
      kind: Intent.MOVE_CURSOR,
      by: 1,
    });
  });

  test("left and right change the setting", () => {
    expect(Intent.forKey(SETTINGS, key("ArrowRight"), true)).toEqual({
      kind: Intent.CYCLE_SETTING,
      by: 1,
    });
    expect(Intent.forKey(SETTINGS, key("ArrowLeft"), true)).toEqual({
      kind: Intent.CYCLE_SETTING,
      by: -1,
    });
  });

  test("the menu key closes it", () => {
    expect(kindFor(SETTINGS, "S")).toBe(Intent.RESUME);
  });

  test("enter acts on the row under the cursor", () => {
    expect(kindFor(SETTINGS, "Enter")).toBe(Intent.PICK_ROW);
  });

  test("help opens the controls from here", () => {
    expect(kindFor(SETTINGS, "?")).toBe(Intent.OPEN_HELP);
  });

  test("keys with no meaning here are ignored", () => {
    expect(kindFor(SETTINGS, "q")).toBe(Intent.NOTHING);
  });
});
