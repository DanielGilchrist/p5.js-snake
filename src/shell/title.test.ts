import { describe, expect, test } from "bun:test";

import * as Assert from "../core/assert";
import * as Option from "../core/option";
import * as Prompt from "../render/scene";
import * as Mode from "./mode";
import * as Title from "./title";

const SITE = "https://example.test/snake/";

const START = Title.opening(Title.SHARED);

const at = (entry: Title.Entry, counts: Title.Counts = Title.START): Title.Place => ({
  ...START,
  cursor: START.entries.indexOf(entry),
  counts,
});

const outcome = (place: Title.Place): Title.Outcome => Title.chosen(SITE, place);

const href = (place: Title.Place): string => {
  const picked = outcome(place);

  if (picked.kind !== Title.GO) Assert.unreachable("this place should start a game");

  return picked.href;
};

const moved = (place: Title.Place): Title.Place => {
  const picked = outcome(place);

  if (picked.kind !== Title.AT) Assert.unreachable("this place should open another screen");

  return picked.place;
};

describe("what the menu offers", () => {
  test("the plain address opens the menu, and what it starts is a game", () => {
    expect(Mode.launch(SITE).kind).toBe(Mode.TITLE);
    expect(Mode.launch(href(at(Title.SOLO))).kind).toBe(Mode.PLAY);
    expect(Mode.launch(href(at(Title.FRIEND))).kind).toBe(Mode.PLAY);
  });

  test("each entry lands in the mode it names", () => {
    expect(Mode.read(href(at(Title.SOLO))).kind).toBe(Mode.ALONE);
    expect(Mode.read(href(at(Title.FRIEND))).kind).toBe(Mode.WITH_A_FRIEND);
    expect(Mode.read(href(moved(at(Title.COMPUTER)))).kind).toBe(Mode.AGAINST_THE_COMPUTER);
    expect(Mode.read(href(moved(at(Title.ROOM)))).kind).toBe(Mode.OVER_THE_NETWORK);
  });

  test("the two overlays never navigate", () => {
    expect(outcome(at(Title.HOW)).kind).toBe(Title.SHOW_HOW);
    expect(outcome(at(Title.SETTINGS)).kind).toBe(Title.SHOW_SETTINGS);
  });

  test("sharing one small screen is not offered when there is only one pad", () => {
    const shared = Title.entriesFor(Title.SHARED);
    const alone = Title.entriesFor(Title.OWN_DEVICE);

    expect(shared).toContain(Title.FRIEND);
    expect(alone).not.toContain(Title.FRIEND);
    expect(alone.length).toBe(shared.length - 1);

    for (const entry of alone) expect(shared).toContain(entry);
  });

  test("the cursor still names the right entry once one is missing", () => {
    const handheld = Title.opening(Title.OWN_DEVICE);

    expect(Title.slotsAt(handheld).length).toBe(Title.entriesFor(Title.OWN_DEVICE).length);

    for (const [index, entry] of Title.entriesFor(Title.OWN_DEVICE).entries()) {
      expect(Title.entryAt(handheld, index)).toBe(entry);
    }
  });

  test("a link still starts a shared game even where the menu hides it", () => {
    expect(Mode.read(`${SITE}?friend`).kind).toBe(Mode.WITH_A_FRIEND);
  });

  test("only the modes that need a number ask for one", () => {
    const opens = Title.slotsAt(START).map((slot) => slot.kind === Title.OPENS);

    expect(opens).toEqual([false, true, false, true, false, false]);
    expect(Title.slotsAt(Title.opening(Title.OWN_DEVICE)).map((slot) => slot.kind)).toEqual([
      Title.PLAIN,
      Title.OPENS,
      Title.OPENS,
      Title.PLAIN,
      Title.PLAIN,
    ]);
  });

  test("every entry has a label", () => {
    for (const entry of Title.ENTRIES) expect(Title.labelOf(entry).length).toBeGreaterThan(0);
  });
});

describe("the setup screen", () => {
  const setup = moved(at(Title.COMPUTER));

  test("it names the mode it came from and offers three lines", () => {
    expect(Option.getOrElse(Title.headingOf(setup), "")).toBe("VS CPU");
    expect(Title.slotsAt(setup).length).toBe(3);
    expect(setup.cursor).toBe(0);
  });

  test("it counts players, starts, and offers the way back", () => {
    const kinds = Title.slotsAt(setup).map((slot) => slot.kind);

    expect(kinds).toEqual([Title.COUNTED, Title.PLAIN, Title.RETURNS]);
  });

  test("escaping goes back from anywhere on the screen, and does nothing at the root", () => {
    for (const cursor of [0, 1, 2]) {
      const left = Title.backed({ ...setup, cursor });

      expect(left.where.kind).toBe(Title.ROOT);
      expect(Title.entryAt(left, left.cursor)).toBe(Title.COMPUTER);
    }

    expect(Title.backed(START)).toEqual(START);
  });

  test("going back keeps the count for when you come again", () => {
    const three = Title.nudged(Title.nudged(setup, 1), 1);
    const again = moved(at(Title.COMPUTER, Title.backed(three).counts));

    expect(Mode.read(href(again)).rules.players).toBe(4);
  });

  test("back returns to the row it was opened from", () => {
    const back = moved(Title.moved(Title.moved(setup, 1), 1));

    expect(back.where.kind).toBe(Title.ROOT);
    expect(Title.entryAt(back, back.cursor)).toBe(Title.COMPUTER);
  });

  test("the count it leaves with is the count the game starts with", () => {
    const three = Title.nudged(Title.nudged(setup, 1), 1);

    expect(Mode.read(href(three)).rules.players).toBe(4);
    expect(Mode.read(href(Title.moved(three, 1))).rules.players).toBe(4);
  });

  test("a room asks for players, not opponents", () => {
    const room = Title.nudged(moved(at(Title.ROOM)), 1);

    expect(Mode.read(href(room)).rules.players).toBe(3);
    expect(Mode.read(href(room)).hosting).toBe(true);
  });

  test("nudging anything but the count line changes nothing", () => {
    const onStart = Title.moved(setup, 1);

    expect(Title.nudged(onStart, 1)).toEqual(onStart);
    expect(Title.nudged(START, 1)).toEqual(START);
  });

  test("the count stops at both ends instead of wrapping", () => {
    let place = setup;

    for (let i = 0; i < 20; i++) place = Title.nudged(place, 1);

    expect(Mode.read(href(place)).rules.players).toBe(Mode.MOST_PLAYERS);

    for (let i = 0; i < 20; i++) place = Title.nudged(place, -1);

    expect(Mode.read(href(place)).rules.players).toBe(2);
  });

  test("no count ever asks for more players than the game allows", () => {
    for (const entry of [Title.COMPUTER, Title.ROOM] as const) {
      let place = moved(at(entry));

      for (let i = 0; i < 12; i++) {
        place = Title.nudged(place, 1);

        const [line] = Title.slotsAt(place);

        expect(line?.kind).toBe(Title.COUNTED);
        if (line?.kind !== Title.COUNTED) continue;

        expect(line.seats.shown).toBeLessThanOrEqual(Mode.MOST_PLAYERS);
        expect(Mode.read(href(place)).rules.players).toBe(line.seats.shown);
      }
    }
  });
});

describe("walking the rows", () => {
  test("the cursor wraps at both ends of whichever screen it is on", () => {
    const last = Title.ENTRIES.length - 1;

    expect(Title.moved(START, -1).cursor).toBe(last);
    expect(Title.moved({ ...START, cursor: last }, 1).cursor).toBe(0);

    const setup = moved(at(Title.ROOM));

    expect(Title.moved(setup, -1).cursor).toBe(2);
    expect(Title.moved(Title.moved(setup, 1), -1).cursor).toBe(0);
  });

  test("both screens say what the keys do", () => {
    for (const prompt of [Prompt.KEYS, Prompt.TOUCH] as const) {
      expect(Title.hintFor(START, prompt).length).toBeGreaterThan(0);
      expect(Title.hintFor(moved(at(Title.ROOM)), prompt).length).toBeGreaterThan(0);
    }
  });
});

describe("the way back to the menu", () => {
  test("going home drops the mode it came from", () => {
    expect(Mode.launch(Title.home(href(at(Title.SOLO)))).kind).toBe(Mode.TITLE);
    expect(Mode.launch(Title.home(`${SITE}?room=ABCDEF`)).kind).toBe(Mode.TITLE);
  });

  test("the debug flags survive the trip in both directions", () => {
    const debugging = `${SITE}?probe&long=120`;
    const playing = Title.chosen(debugging, at(Title.SOLO));

    if (playing.kind !== Title.GO) Assert.unreachable("solo should start a game");

    expect(Mode.read(playing.href).showing).toBe(true);
    expect(Mode.read(playing.href).rules.growth).toBe(120);
    expect(Mode.launch(Title.home(playing.href)).kind).toBe(Mode.TITLE);
    expect(Title.home(playing.href)).toContain("probe");
  });

  test("a link someone shared still goes straight into the room", () => {
    const launch = Mode.launch(`${SITE}?room=ABCDEF`);

    expect(launch.kind).toBe(Mode.PLAY);
    if (launch.kind === Mode.PLAY) expect(launch.mode.joining).toBe(true);
  });
});
