import { rm } from "node:fs/promises";

import * as Option from "../src/core/option";

export const DEBUG = "debug";
export const RELEASE = "release";

export type Mode = typeof DEBUG | typeof RELEASE;

export const modeOf = (raw: string | undefined): Option.Type<Mode> => {
  if (raw === DEBUG) return Option.some(DEBUG);
  if (raw === RELEASE) return Option.some(RELEASE);

  return Option.none;
};

export const argsFor = (mode: Mode, watching = false): readonly string[] => [
  "bun",
  "build",
  "src/index.html",
  "--outdir",
  "dist",
  "--define",
  `DEBUG_BUILD=${mode === DEBUG}`,
  ...(mode === RELEASE ? ["--minify", "--sourcemap=linked"] : []),
  ...(watching ? ["--watch"] : []),
];

export const swept = async (): Promise<void> => {
  await rm(new URL("../dist", import.meta.url), { recursive: true, force: true });
};

const stdio = ["inherit", "inherit", "inherit"] as const;

const run = (args: readonly string[]): number => Bun.spawnSync([...args], { stdio }).exitCode ?? 1;

if (import.meta.main) {
  const asked = modeOf(Bun.argv[2]);

  if (!asked.some) {
    console.error(`build: expected "${DEBUG}" or "${RELEASE}", got ${Bun.argv[2] ?? "nothing"}`);
    process.exit(2);
  }

  await swept();

  const built = run(argsFor(asked.value));

  if (built !== 0) process.exit(built);

  if (asked.value === RELEASE) process.exit(run(["bun", "run", "scripts/offline.ts"]));
}
