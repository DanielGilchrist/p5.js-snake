import { describe, expect, test } from "bun:test";

import * as Settings from "../render/settings";
import * as Slots from "./slots";
import * as Storage from "./storage";

const held = (start: Record<string, string> = {}): Storage.Store => {
  const kept = new Map(Object.entries(start));

  return {
    getItem: (key) => kept.get(key) ?? null,
    setItem: (key, value) => {
      kept.set(key, value);
    },
  };
};

const failing = (): Storage.Store => ({
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
});

const spying = (): { readonly store: Storage.Store; readonly keys: string[] } => {
  const keys: string[] = [];

  return {
    store: {
      getItem: (key) => {
        keys.push(key);

        return null;
      },
      setItem: (key) => {
        keys.push(key);
      },
    },
    keys,
  };
};

describe("storage", () => {
  test("a written value comes back", () => {
    const vault = Storage.open(held());
    const settings: Settings.Type = { theme: "stoneware", hand: "left" };

    vault.write(Slots.SETTINGS, settings);

    expect(vault.read(Slots.SETTINGS)).toEqual(settings);
  });

  test("an unwritten slot reads its own default", () => {
    expect(Storage.open(held()).read(Slots.SETTINGS)).toEqual(Settings.DEFAULT);
  });

  test("junk in a slot falls back to that slot's default", () => {
    const vault = Storage.open(held({ "snake.settings": "not-even-close" }));

    expect(vault.read(Slots.SETTINGS)).toEqual(Settings.DEFAULT);
  });

  test("a half-known value keeps the part it understands", () => {
    const vault = Storage.open(held({ "snake.settings": "stoneware:sideways" }));
    const read = vault.read(Slots.SETTINGS);

    expect(read.theme).toBe("stoneware");
    expect(read.hand).toBe(Settings.DEFAULT.hand);
  });

  test("slots are namespaced, so callers never name a raw key", () => {
    const { store, keys } = spying();
    const vault = Storage.open(store);

    vault.read(Slots.SETTINGS);
    vault.write(Slots.SETTINGS, Settings.DEFAULT);

    expect(keys).toEqual(["snake.settings", "snake.settings"]);
  });

  test("a store that throws is survivable in both directions", () => {
    const vault = Storage.open(failing());

    expect(vault.read(Slots.SETTINGS)).toEqual(Settings.DEFAULT);
    expect(() => {
      vault.write(Slots.SETTINGS, Settings.DEFAULT);
    }).not.toThrow();
  });

  test("a sealed vault reads defaults and swallows writes", () => {
    const vault = Storage.sealed();

    const settings: Settings.Type = { theme: "stoneware", hand: "left" };

    vault.write(Slots.SETTINGS, settings);

    expect(vault.read(Slots.SETTINGS)).toEqual(Settings.DEFAULT);
  });

  test("every settings combination survives a round trip", () => {
    const vault = Storage.open(held());

    for (const theme of Settings.THEMES) {
      for (const hand of Settings.HANDS) {
        const settings: Settings.Type = { theme, hand };

        vault.write(Slots.SETTINGS, settings);

        expect(vault.read(Slots.SETTINGS)).toEqual(settings);
      }
    }
  });
});
