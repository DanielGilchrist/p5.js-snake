import { packageManager } from "../package.json";

const expected = packageManager.replace(/^bun@/, "");

if (Bun.version !== expected) {
  console.warn(
    `warning: package.json pins bun@${expected} but you are running ${Bun.version}.\n` +
      `         run \`bun upgrade --to ${expected}\` to match CI.`,
  );
}
