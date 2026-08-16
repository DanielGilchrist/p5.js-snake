import { describe, expect, test } from "bun:test";

import * as Build from "./build";

const defineIn = (args: readonly string[]): string | undefined => {
  const at = args.indexOf("--define");

  return at < 0 ? undefined : args[at + 1];
};

describe("choosing a build", () => {
  test("only the two known modes are accepted", () => {
    expect(Build.modeOf("debug")).toEqual({ some: true, value: Build.DEBUG });
    expect(Build.modeOf("release")).toEqual({ some: true, value: Build.RELEASE });
  });

  test("anything else is refused rather than guessed at", () => {
    for (const raw of [undefined, "", "prod", "production", "Release", "true"]) {
      expect(Build.modeOf(raw).some).toBe(false);
    }
  });
});

describe("what each build defines", () => {
  test("a release build turns the parameter checking off", () => {
    expect(defineIn(Build.argsFor(Build.RELEASE))).toBe("DEBUG_BUILD=false");
  });

  test("a debug build leaves it on", () => {
    expect(defineIn(Build.argsFor(Build.DEBUG))).toBe("DEBUG_BUILD=true");
  });

  test("every build says which one it is, so the flag cannot go missing", () => {
    for (const mode of [Build.DEBUG, Build.RELEASE] as const) {
      expect(defineIn(Build.argsFor(mode))).toBeDefined();
      expect(defineIn(Build.argsFor(mode, true))).toBeDefined();
    }
  });

  test("only a release build is minified", () => {
    expect(Build.argsFor(Build.RELEASE)).toContain("--minify");
    expect(Build.argsFor(Build.DEBUG)).not.toContain("--minify");
  });

  test("watching is only added when asked for", () => {
    expect(Build.argsFor(Build.DEBUG, true)).toContain("--watch");
    expect(Build.argsFor(Build.DEBUG)).not.toContain("--watch");
  });
});
