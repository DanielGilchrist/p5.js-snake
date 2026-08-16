import * as Playwright from "playwright";

import * as Serve from "./serve";

type Probe = {
  readonly phase: string;
  readonly where?: string;
  readonly demo?: string;
  readonly mark: number;
  readonly score: number;
};

const MOVING_MS = 1200;

const dist = new URL("../dist/index.html", import.meta.url);

const complain = (why: string): never => {
  console.error(`smoke: ${why}`);
  process.exit(1);
};

const probing = async (page: Playwright.Page): Promise<Probe> => {
  const seen = await page.evaluate(() => {
    const held = (window as unknown as { snakeProbe?: () => unknown }).snakeProbe;

    return typeof held === "function" ? held() : null;
  });

  if (seen === null) return complain("the game never exposed its probe, so it did not boot");

  return seen as Probe;
};

const pressed = async (page: Playwright.Page, key: string): Promise<void> => {
  await page.keyboard.press(key);
  await page.waitForTimeout(250);
};

const boots = async (page: Playwright.Page, url: string): Promise<void> => {
  await page.goto(url);

  await page
    .waitForFunction(
      () => typeof (window as unknown as { snakeProbe?: unknown }).snakeProbe === "function",
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => complain("the game never started: no probe appeared within ten seconds"));

  const painted = await page.evaluate(() =>
    [...document.querySelectorAll("canvas")].reduce(
      (most, canvas) => Math.max(most, canvas.width * canvas.height),
      0,
    ),
  );

  if (painted === 0) complain("a canvas exists but nothing gave it a size");
};

const shows = async (page: Playwright.Page, phase: string): Promise<void> => {
  await page
    .waitForFunction(
      (wanted) =>
        (window as unknown as { snakeProbe?: () => { phase: string } }).snakeProbe?.().phase ===
        wanted,
      phase,
      { timeout: 10_000 },
    )
    .catch(() => complain(`the game never reached "${phase}"`));
};

const opens = async (page: Playwright.Page): Promise<void> => {
  await shows(page, "title");

  const menu = await probing(page);

  if (menu.demo === "off") complain("the game behind the menu never started");

  await pressed(page, "ArrowDown");
  await pressed(page, "Enter");

  const setup = await probing(page);

  if (setup.where !== "setup") {
    complain(`the menu never opened the setup screen: it is showing "${setup.where}"`);
  }

  await pressed(page, "ArrowRight");
  await pressed(page, "Enter");
};

const runs = async (page: Playwright.Page): Promise<void> => {
  await shows(page, "live");

  const before = await probing(page);

  await page.waitForTimeout(MOVING_MS);

  const after = await probing(page);

  if (after.mark === before.mark) complain("the world never changed, so the game is not running");
};

const listens = async (page: Playwright.Page): Promise<void> => {
  await pressed(page, "Shift+S");

  const opened = await probing(page);

  if (opened.phase !== "settings") {
    complain(`a key press never reached the game: expected the settings, got "${opened.phase}"`);
  }

  await pressed(page, "Shift+S");

  const closed = await probing(page);

  if (closed.phase === "settings") complain("the settings never closed again");
};

const shut = async (
  browser: Playwright.Browser,
  server: { stop: (force?: boolean) => void },
): Promise<void> => {
  await browser.close();
  server.stop(true);
};

if (!(await Bun.file(dist).exists())) {
  complain("there is no build to test — run `bun run bundle` first");
}

const server = Bun.serve({ port: 0, fetch: Serve.served });
const browser = await Playwright.chromium.launch();
const page = await browser.newPage();
const shouts: string[] = [];

page.on("pageerror", (error) => shouts.push(`page error: ${error.message}`));
page.on("console", (line) => {
  if (line.type() === "error") shouts.push(`console error: ${line.text()}`);
});

try {
  await boots(page, `http://localhost:${server.port}/?probe`);
  await opens(page);
  await runs(page);
  await listens(page);
} finally {
  if (shouts.length > 0) {
    await shut(browser, server);
    complain(`the game complained while running:\n  ${shouts.join("\n  ")}`);
  }

  await shut(browser, server);
}

console.log("smoke: the menu opens, the game runs and the keyboard reaches it");
