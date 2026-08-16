import * as Build from "./build";

const stdio = ["inherit", "inherit", "inherit"] as const;

const initial = Bun.spawnSync([...Build.argsFor(Build.DEBUG)], { stdio });
if (!initial.success) process.exit(initial.exitCode);

const children = [
  Bun.spawn(["bunx", "tsc", "--noEmit", "--watch", "--preserveWatchOutput"], { stdio }),
  Bun.spawn([...Build.argsFor(Build.DEBUG, true)], { stdio }),
  Bun.spawn(["bun", "run", "scripts/serve.ts"], { stdio }),
];

const shutdown = () => {
  for (const child of children) child.kill();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.all(children.map((child) => child.exited));
