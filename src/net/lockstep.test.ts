import { describe, expect, test } from "bun:test";

import type * as Geometry from "../core/geometry";
import * as Option from "../core/option";
import * as Players from "../core/players";
import * as Lockstep from "./lockstep";

type Run = readonly Geometry.Direction[];

type Table = Map<number, Map<number, Run>>;

type Peer = {
  readonly seat: number;
  state: Lockstep.Waiting;
  readonly applied: string[];
};

const peer = (seat: number): Peer => ({ seat, state: Lockstep.waiting(0), applied: [] });

const post = (table: Table, seat: number, beat: number, run: Run): void => {
  const held = table.get(seat) ?? new Map<number, Run>();

  held.set(beat, run);
  table.set(seat, held);
};

const heard = (
  table: Table,
  mine: number,
  beat: number,
  seats: number,
): Option.Type<readonly Lockstep.Seated[]> => {
  const found: Lockstep.Seated[] = [];

  for (let seat = 0; seat < seats; seat++) {
    if (seat === mine) continue;

    const run = table.get(seat)?.get(beat);

    if (run === undefined) return Option.none;

    found.push({ seat: Players.id(seat), runs: run });
  }

  return Option.some(found);
};

const pump = (mine: Peer, table: Table, seats: number): void => {
  const opening = Lockstep.step(mine.state, Option.none);

  if (opening.kind === Lockstep.COMMIT) {
    post(table, mine.seat, opening.beat, opening.committed);
    mine.state = opening.next;
  }

  const turn = Lockstep.step(mine.state, heard(table, mine.seat, mine.state.beat, seats));

  if (turn.kind !== Lockstep.ADVANCE) return;

  const runs = [...turn.theirs, { seat: Players.id(mine.seat), runs: turn.mine }].toSorted(
    (one, other) => Number(one.seat) - Number(other.seat),
  );

  mine.applied.push(`${mine.state.beat}:${runs.map((seated) => seated.runs.join("+")).join("|")}`);
  mine.state = turn.next;
};

describe("lockstep", () => {
  test("a key pressed while stalled is not applied before it is sent", () => {
    const alice = peer(0);
    const table: Table = new Map();

    pump(alice, table, 2);

    expect(table.get(0)?.get(0)).toEqual([]);

    alice.state = Lockstep.pressed(alice.state, "up");
    post(table, 1, 0, []);

    pump(alice, table, 2);

    expect(alice.applied).toEqual(["0:|"]);
    expect(table.get(0)?.get(0)).toEqual([]);
  });

  test("every peer applies the same runs in the same order", () => {
    const seats = 4;
    const peers = Array.from({ length: seats }, (_, seat) => peer(seat));
    const table: Table = new Map();

    for (let round = 0; round < 8; round++) {
      if (round === 1) peers[0]!.state = Lockstep.pressed(peers[0]!.state, "up");
      if (round === 2) peers[2]!.state = Lockstep.pressed(peers[2]!.state, "left");
      if (round === 3) peers[3]!.state = Lockstep.pressed(peers[3]!.state, "down");

      for (const each of peers) pump(each, table, seats);
      for (const each of peers) pump(each, table, seats);
    }

    const shared = Math.min(...peers.map((each) => each.applied.length));

    expect(shared).toBeGreaterThan(2);

    for (const each of peers) {
      expect(each.applied.slice(0, shared)).toEqual(peers[0]!.applied.slice(0, shared));
    }
  });

  test("one silent peer stalls the whole table", () => {
    const seats = 3;
    const table: Table = new Map();
    const alice = peer(0);

    post(table, 1, 0, []);

    pump(alice, table, seats);

    expect(alice.applied).toEqual([]);

    post(table, 2, 0, []);
    pump(alice, table, seats);

    expect(alice.applied).toEqual(["0:||"]);
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
  });
});
