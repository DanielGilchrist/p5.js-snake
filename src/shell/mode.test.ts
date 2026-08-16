import { describe, expect, test } from "bun:test";

import * as Game from "../core/game";
import * as Input from "../core/input";
import * as Option from "../core/option";
import * as Players from "../core/players";
import * as Palette from "../render/palette";
import * as Mode from "./mode";

const SITE = "https://someone.github.io/p5.js-snake/";

const SECOND = Players.id(1);
const THIRD = Players.id(2);

const cpu = Mode.read(`${SITE}?cpu`);
const friend = Mode.read(`${SITE}?friend`);
const crowd = { ...cpu, rules: Game.forPlayers(3) };

const cheer = (mode: Mode.Mode, who: Players.Id): Mode.Cheer =>
  Mode.cheerFor(mode, Option.some(who), Players.FIRST);

const shown = (mode: Mode.Mode, who: Players.Id): string => {
  const told = cheer(mode, who);
  const heads = told.who.map((seat) => `<${Number(seat)}>`).join(" ");

  return heads === "" ? told.title : `${heads} ${told.title}`;
};

describe("calling the winner", () => {
  test("winning it yourself shows your snake beside the call", () => {
    expect(cheer(cpu, Players.FIRST)).toEqual({ who: [Players.FIRST], title: "YOU WIN" });
  });

  test("a lone machine is still called the CPU, beside its snake", () => {
    expect(shown(cpu, SECOND)).toBe("<1> CPU WINS");
  });

  test("anyone else is called by their snake rather than a colour", () => {
    expect(shown(friend, Players.FIRST)).toBe("<0> WINS");
    expect(shown(friend, SECOND)).toBe("<1> WINS");
  });

  test("a draw shows the snakes that shared it", () => {
    expect(Mode.cheerFor(cpu, Option.none, Players.FIRST, [Players.FIRST, SECOND])).toEqual({
      who: [Players.FIRST, SECOND],
      title: "DRAW",
    });
  });

  test("a crowd of machines is told apart by whose snake is shown", () => {
    expect(shown(crowd, Players.FIRST)).toBe("<0> YOU WIN");
    expect(shown(crowd, SECOND)).toBe("<1> WINS");
    expect(shown(crowd, THIRD)).toBe("<2> WINS");
  });
});

describe("labelling snakes", () => {
  const solo = Mode.read(SITE);

  test("playing alone nobody needs a label", () => {
    expect(Mode.tagFor(solo, Players.FIRST, Players.FIRST).some).toBe(false);
  });

  test("against the computer only your own snake is called out", () => {
    expect(Mode.tagFor(cpu, Players.FIRST, Players.FIRST)).toEqual(Option.some("YOU"));
    expect(Mode.tagFor(cpu, SECOND, Players.FIRST).some).toBe(false);
  });

  test("with a friend each snake is labelled by the keys that drive it", () => {
    expect(Mode.tagFor(friend, Players.FIRST, Players.FIRST)).toEqual(Option.some("ARROWS"));
    expect(Mode.tagFor(friend, SECOND, Players.FIRST)).toEqual(Option.some("W A S D"));
  });

  test("the ring marks your snake except with a friend, where neither is yours", () => {
    expect(Mode.ringed(cpu)).toBe(true);
    expect(Mode.ringed(friend)).toBe(false);
  });
});

describe("who the keyboard drives", () => {
  const solo = Mode.read(SITE);

  test("playing alone every scheme drives you", () => {
    for (const code of ["ArrowUp", "w", "k"]) {
      expect(Input.parseKey(code, Mode.controlsFor(solo))).toEqual(Input.turn(0, "up"));
    }
  });

  test("against the computer you still hold the whole keyboard", () => {
    expect(Input.parseKey("w", Mode.controlsFor(cpu))).toEqual(Input.turn(0, "up"));
  });

  test("with a friend the keyboard splits between you", () => {
    const shared = Mode.controlsFor(friend);

    expect(Input.parseKey("ArrowUp", shared)).toEqual(Input.turn(0, "up"));
    expect(Input.parseKey("w", shared)).toEqual(Input.turn(1, "up"));
  });
});

const playersIn = (href: string): number => Mode.read(href).rules.players;

describe("how many players a link asks for", () => {
  test("plain cpu is you against one machine", () => {
    expect(playersIn(`${SITE}?cpu`)).toBe(2);
  });

  test("a count asks for that many machines alongside you", () => {
    expect(playersIn(`${SITE}?cpu=2`)).toBe(3);
    expect(playersIn(`${SITE}?cpu=7`)).toBe(8);
  });

  test("the table is capped however many are asked for", () => {
    expect(playersIn(`${SITE}?cpu=20`)).toBe(Mode.MOST_PLAYERS);
  });

  test("nonsense counts fall back to a single machine", () => {
    expect(playersIn(`${SITE}?cpu=nope`)).toBe(2);
    expect(playersIn(`${SITE}?cpu=0`)).toBe(2);
    expect(playersIn(`${SITE}?cpu=-3`)).toBe(2);
  });

  test("every machine but you is driven by the computer", () => {
    const crowded = Mode.read(`${SITE}?cpu=3`);

    expect(Mode.machines(crowded)).toEqual([Players.id(1), Players.id(2), Players.id(3)]);
    expect(Mode.machines(Mode.read(SITE))).toEqual([]);
  });

  test("there is a colour for every seat at a full table", () => {
    expect(Palette.bodies(Palette.EARTHENWARE)).toBeGreaterThanOrEqual(Mode.MOST_PLAYERS);
    expect(Palette.bodies(Palette.STONEWARE)).toBe(Palette.bodies(Palette.EARTHENWARE));
  });
});

describe("starting long for profiling", () => {
  test("no flag means the usual short snakes", () => {
    expect(Mode.read(SITE).rules.growth).toBe(0);
    expect(Mode.read(`${SITE}?cpu=7`).rules.growth).toBe(0);
  });

  test("the flag sets how long everyone starts", () => {
    expect(Mode.read(`${SITE}?long=80`).rules.growth).toBe(80);
    expect(Mode.read(`${SITE}?cpu=7&long=120`).rules.growth).toBe(120);
  });

  test("it is capped, and nonsense falls back to a token length", () => {
    expect(Mode.read(`${SITE}?long=99999`).rules.growth).toBe(400);
    expect(Mode.read(`${SITE}?long=nope`).rules.growth).toBe(1);
  });
});
