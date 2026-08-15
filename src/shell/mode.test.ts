import { describe, expect, test } from "bun:test";

import * as Game from "../core/game";
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

const cheer = (mode: Mode.Mode, who: Players.Id): string =>
  Mode.cheerFor(mode, Option.some(who), Players.FIRST);

describe("naming players", () => {
  test("against the computer, you are you and it is the CPU", () => {
    expect(cheer(cpu, Players.FIRST)).toBe("YOU WIN");
    expect(cheer(cpu, SECOND)).toBe("CPU WINS");
  });

  test("with a friend, neither of you is 'you', so they go by colour", () => {
    expect(cheer(friend, Players.FIRST)).toBe("GREEN WINS");
    expect(cheer(friend, SECOND)).toBe("PURPLE WINS");
  });

  test("nobody left standing is a draw", () => {
    expect(Mode.cheerFor(cpu, Option.none, Players.FIRST)).toBe("A DRAW");
  });

  test("more than one machine drops the ambiguous CPU label for colours", () => {
    expect(cheer(crowd, Players.FIRST)).toBe("YOU WIN");
    expect(cheer(crowd, SECOND)).toBe(`${Palette.nameOf(1)} WINS`);
    expect(cheer(crowd, THIRD)).toBe(`${Palette.nameOf(2)} WINS`);
    expect(cheer(crowd, SECOND)).not.toBe(cheer(crowd, THIRD));
  });

  test("names follow the colours a player is actually drawn in", () => {
    for (let seat = 0; seat < Palette.bodies(); seat++) {
      expect(Mode.nameFor(friend, Players.id(seat), Players.FIRST)).toBe(Palette.nameOf(seat));
    }
  });

  test("a seat past the last colour wraps rather than falling apart", () => {
    const extra = Palette.bodies();

    expect(Palette.nameOf(extra)).toBe(Palette.nameOf(0));
    expect(Mode.nameFor(friend, Players.id(extra), Players.FIRST)).toBe(Palette.nameOf(0));
  });
});
