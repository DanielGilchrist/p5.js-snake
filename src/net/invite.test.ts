import { describe, expect, test } from "bun:test";

import * as Code from "./code";
import * as Invite from "./invite";

const SITE = "https://someone.github.io/p5.js-snake/";

const madeUp = (): Code.Type => {
  const parsed = Code.parse("4KA4U5");

  if (!parsed.some) throw new Error("fixture code must parse");

  return parsed.value;
};

const roomIn = (href: string): string => {
  const asked = Invite.asked(href);

  return asked.kind === Invite.ROOM ? `${asked.code}` : asked.kind;
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
    expect(roomIn(`${SITE}?room=4KA4U5`)).toBe("4KA4U5");
  });

  test("older hash links still work", () => {
    expect(roomIn(`${SITE}#room=4KA4U5`)).toBe("4KA4U5");
  });

  test("a link with no room asks for nobody", () => {
    for (const href of [SITE, `${SITE}#host`, `${SITE}?other=4KA4U5`]) {
      expect(Invite.asked(href)).toEqual({ kind: Invite.NOBODY });
    }
  });

  test("a malformed room says so rather than passing for no room at all", () => {
    expect(Invite.asked(`${SITE}?room=nope`)).toEqual({ kind: Invite.MALFORMED, raw: "nope" });
    expect(Invite.asked(`${SITE}?room=`)).toEqual({ kind: Invite.MALFORMED, raw: "" });
    expect(Invite.asked(`${SITE}?room=4KA4U5X`)).toEqual({
      kind: Invite.MALFORMED,
      raw: "4KA4U5X",
    });
  });

  test("a lowercase room still joins, because people retype links", () => {
    expect(roomIn(`${SITE}?room=4ka4u5`)).toBe("4KA4U5");
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
