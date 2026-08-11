import { describe, expect, test } from "bun:test";

import * as Code from "./code";
import * as Invite from "./invite";

const SITE = "https://someone.github.io/p5.js-snake/";

const madeUp = (): Code.Type => {
  const parsed = Code.parse("4KA4U5");

  if (!parsed.some) throw new Error("fixture code must parse");

  return parsed.value;
};

describe("invite links", () => {
  test("a shared link puts the room in the query, where chat apps will see it", () => {
    const made = Invite.link(SITE, madeUp());

    expect(made).toBe(`${SITE}?room=4KA4U5`);
    expect(made).not.toContain("#");
  });

  test("a link made from a hosting page does not carry the host flag onwards", () => {
    expect(Invite.link(`${SITE}#host`, madeUp())).toBe(`${SITE}?room=4KA4U5`);
    expect(Invite.link(`${SITE}?host`, madeUp())).toBe(`${SITE}?room=4KA4U5`);
  });

  test("a room reads back out of a query link", () => {
    const read = Invite.read(`${SITE}?room=4KA4U5`);

    expect(read.some).toBe(true);
    if (read.some) expect(`${read.value}`).toBe("4KA4U5");
  });

  test("older hash links still work", () => {
    const read = Invite.read(`${SITE}#room=4KA4U5`);

    expect(read.some).toBe(true);
    if (read.some) expect(`${read.value}`).toBe("4KA4U5");
  });

  test("a link with no room is not a room", () => {
    expect(Invite.read(SITE).some).toBe(false);
    expect(Invite.read(`${SITE}#host`).some).toBe(false);
    expect(Invite.read(`${SITE}?other=4KA4U5`).some).toBe(false);
  });

  test("a malformed room is refused rather than trusted", () => {
    expect(Invite.read(`${SITE}?room=nope`).some).toBe(false);
    expect(Invite.read(`${SITE}?room=`).some).toBe(false);
    expect(Invite.read(`${SITE}?room=4KA4U5X`).some).toBe(false);
  });

  test("a lowercase room still joins, because people retype links", () => {
    const read = Invite.read(`${SITE}?room=4ka4u5`);

    expect(read.some).toBe(true);
    if (read.some) expect(`${read.value}`).toBe("4KA4U5");
  });

  test("flags read from either the query or the hash", () => {
    for (const href of [`${SITE}?host`, `${SITE}#host`, `${SITE}?room=4KA4U5&host`]) {
      expect(Invite.flagged(href, "host")).toBe(true);
    }

    expect(Invite.flagged(SITE, "host")).toBe(false);
  });

  test("hotseat is not mistaken for host", () => {
    expect(Invite.flagged(`${SITE}?hotseat`, "host")).toBe(false);
    expect(Invite.flagged(`${SITE}#hotseat`, "host")).toBe(false);
    expect(Invite.flagged(`${SITE}?hotseat`, "hotseat")).toBe(true);
  });
});
