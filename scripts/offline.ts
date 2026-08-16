import { readdir } from "node:fs/promises";

const src = new URL("../src/", import.meta.url);
const dist = new URL("../dist/", import.meta.url);

const CARRIED = [
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "favicon-32.png",
  "favicon-16.png",
];

const carry = async (): Promise<void> => {
  await Promise.all(
    CARRIED.map((name) => Bun.write(Bun.file(new URL(name, dist)), Bun.file(new URL(name, src)))),
  );
};

const shipped = async (): Promise<readonly string[]> => {
  const found = await readdir(Bun.fileURLToPath(dist));

  return found.filter((name) => !name.endsWith(".map") && name !== "sw.js").toSorted();
};

const stamp = (names: readonly string[]): string => {
  let mark = 7;

  for (const letter of names.join("|")) {
    mark = Math.imul(mark, 31) + letter.codePointAt(0)!;
    mark |= 0;
  }

  return (mark >>> 0).toString(36);
};

const workerFor = (names: readonly string[]): string => `const SHELF = "snake-${stamp(names)}";
const KEPT = ${JSON.stringify(["./", ...names.map((name) => `./${name}`)], null, 2)};

const fresh = (url) => new Request(url, { cache: "reload" });

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELF).then((shelf) => Promise.all(KEPT.map((url) => shelf.add(fresh(url))))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== SHELF).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

const answered = async (request) => {
  try {
    return await fetch(request);
  } catch {
    return undefined;
  }
};

const page = async (request) => {
  const shelf = await caches.open(SHELF);
  const answer = await answered(request);

  if (answer !== undefined && answer.ok) {
    await shelf.put("./index.html", answer.clone());

    return answer;
  }

  const held = await shelf.match("./index.html");

  if (held !== undefined) return held;

  return answer ?? Response.error();
};

const asset = async (request) => {
  const shelf = await caches.open(SHELF);
  const held = await shelf.match(request, { ignoreSearch: true });

  if (held !== undefined) return held;

  const answer = await fetch(request);

  if (answer.ok && answer.type === "basic") shelf.put(request, answer.clone());

  return answer;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(page(request));

    return;
  }

  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(asset(request));
});
`;

await carry();

const names = await shipped();

await Bun.write(Bun.file(new URL("sw.js", dist)), workerFor(names));

console.log(`offline shelf holds ${names.length} files`);
