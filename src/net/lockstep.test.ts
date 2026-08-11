import { describe, expect, test } from "bun:test";

import type * as Geometry from "../core/geometry";
import * as Option from "../core/option";
import * as Lockstep from "./lockstep";

type Wire = Map<number, readonly Geometry.Direction[]>;

type Peer = {
  seat: number;
  state: Lockstep.Waiting;
  sent: Map<number, readonly Geometry.Direction[]>;
  applied: string[];
};

const peer = (seat: number): Peer => ({
  seat,
  state: Lockstep.waiting(0),
  sent: new Map(),
  applied: [],
});

const pump = (mine: Peer, inbox: Wire): void => {
  for (;;) {
    const turn = Lockstep.step(mine.state, Option.some([]) as never);

    if (turn.kind === "commit") {
      mine.sent.set(turn.beat, turn.committed);
      mine.state = turn.next;

      continue;
    }

    break;
  }

  const held = inbox.get(mine.state.beat);
  const turn = Lockstep.step(mine.state, held === undefined ? Option.none : Option.some(held));

  if (turn.kind !== "advance") return;

  const ordered = mine.seat === 0 ? [turn.mine, turn.theirs] : [turn.theirs, turn.mine];

  mine.applied.push(`${mine.state.beat}:${ordered.map((run) => run.join("+")).join("|")}`);
  mine.state = turn.next;
};

describe("lockstep", () => {
  test("a key pressed while stalled is not applied before it is sent", () => {
    const alice = peer(0);
    const empty: Wire = new Map();

    pump(alice, empty);

    expect(alice.sent.get(0)).toEqual([]);

    alice.state = Lockstep.pressed(alice.state, "up");

    const inbox: Wire = new Map([[0, []]]);

    pump(alice, inbox);

    expect(alice.applied).toEqual(["0:|"]);
    expect(alice.sent.get(0)).toEqual([]);
  });

  test("what a peer applies for a beat is exactly what it sent for that beat", () => {
    const alice = peer(0);
    const bob = peer(1);
    const toAlice: Wire = new Map();
    const toBob: Wire = new Map();

    const shuttle = (): void => {
      for (const [beat, run] of alice.sent) toBob.set(beat, run);
      for (const [beat, run] of bob.sent) toAlice.set(beat, run);
    };

    for (let round = 0; round < 6; round++) {
      if (round === 1) alice.state = Lockstep.pressed(alice.state, "up");
      if (round === 2) bob.state = Lockstep.pressed(bob.state, "left");
      if (round === 3) alice.state = Lockstep.pressed(alice.state, "down");

      pump(alice, toAlice);
      pump(bob, toBob);
      shuttle();
      pump(alice, toAlice);
      pump(bob, toBob);
      shuttle();
    }

    const shared = Math.min(alice.applied.length, bob.applied.length);

    expect(shared).toBeGreaterThan(2);
    expect(alice.applied.slice(0, shared)).toEqual(bob.applied.slice(0, shared));
  });

  test("a press during a stall lands on the next beat instead of being lost", () => {
    let held = Lockstep.waiting(0);
    const first = Lockstep.step(held, Option.none);

    expect(first.kind).toBe("commit");
    if (first.kind !== "commit") return;

    held = first.next;
    held = Lockstep.pressed(held, "up");

    const stalled = Lockstep.step(held, Option.none);

    expect(stalled.kind).toBe("stall");

    const moved = Lockstep.step(held, Option.some([]));

    expect(moved.kind).toBe("advance");
    if (moved.kind !== "advance") return;

    expect(moved.mine).toEqual([]);
    expect(moved.next.queued).toEqual(["up"]);

    const after = Lockstep.step(moved.next, Option.none);

    expect(after.kind).toBe("commit");
    if (after.kind === "commit") expect(after.committed).toEqual(["up"]);
  });
});
