import { describe, expect, test } from "bun:test";

import * as Countdown from "./countdown";
import * as Units from "./units";

describe("wordFor", () => {
  test("counts whole seconds down", () => {
    expect(Countdown.wordFor(Units.millis(2600))).toBe("3");
    expect(Countdown.wordFor(Units.millis(2000))).toBe("2");
    expect(Countdown.wordFor(Units.millis(1400))).toBe("2");
    expect(Countdown.wordFor(Units.millis(600))).toBe("1");
  });

  test("says GO once the count runs out", () => {
    expect(Countdown.wordFor(Units.millis(0))).toBe("GO");
    expect(Countdown.wordFor(Units.millis(-40))).toBe("GO");
  });
});
