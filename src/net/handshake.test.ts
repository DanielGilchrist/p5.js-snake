import { describe, expect, test } from "bun:test";

import * as Handshake from "./handshake";

type Seat = 0 | 1;

type Peer = {
  ready: boolean;
  heardReady: boolean;
  heardTurns: boolean;
};

const fresh = (): Peer => ({ ready: false, heardReady: false, heardTurns: false });

const sealed = (peer: Peer): boolean =>
  Handshake.settled(Handshake.signals(peer.ready, peer.heardReady, peer.heardTurns));

const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

const table = (): readonly [Peer, Peer] => [fresh(), fresh()];

const readyUp = (peers: readonly [Peer, Peer], seat: Seat, delivered: boolean): void => {
  const mine = peers[seat];

  mine.ready = true;

  if (delivered) peers[other(seat)].heardReady = true;
};

const beat = (peers: readonly [Peer, Peer]): void => {
  for (const seat of [0, 1] as const) {
    const mine = peers[seat];

    if (sealed(mine)) {
      peers[other(seat)].heardTurns = true;

      continue;
    }

    if (mine.ready) peers[other(seat)].heardReady = true;
  }
};

const runOut = (peers: readonly [Peer, Peer]): void => {
  for (let i = 0; i < 8; i++) beat(peers);
};

describe("ready handshake", () => {
  test("neither side starts before it has said it is ready", () => {
    const peers = table();

    readyUp(peers, 0, true);
    runOut(peers);

    expect(sealed(peers[0])).toBe(false);
    expect(sealed(peers[1])).toBe(false);
  });

  test("both start once both have said so", () => {
    const peers = table();

    readyUp(peers, 0, true);
    readyUp(peers, 1, true);
    runOut(peers);

    expect(sealed(peers[0])).toBe(true);
    expect(sealed(peers[1])).toBe(true);
  });

  test("both still start when either ready note is lost", () => {
    for (const dropped of [0, 1] as const) {
      for (const first of [0, 1] as const) {
        const peers = table();

        readyUp(peers, first, dropped !== first);
        readyUp(peers, other(first), dropped !== other(first));
        runOut(peers);

        expect(sealed(peers[0])).toBe(true);
        expect(sealed(peers[1])).toBe(true);
      }
    }
  });

  test("nobody is left behind for any order or loss of the two notes", () => {
    for (const first of [0, 1] as const) {
      for (const firstLands of [true, false]) {
        for (const secondLands of [true, false]) {
          const peers = table();

          readyUp(peers, first, firstLands);
          readyUp(peers, other(first), secondLands);
          runOut(peers);

          const both = sealed(peers[0]) && sealed(peers[1]);

          expect(both).toBe(true);
        }
      }
    }
  });

  test("a peer whose partner sealed first still starts, because turns prove readiness", () => {
    const peers = table();

    readyUp(peers, 0, true);
    readyUp(peers, 1, false);

    expect(sealed(peers[1])).toBe(true);
    expect(sealed(peers[0])).toBe(false);

    beat(peers);

    expect(peers[0].heardTurns).toBe(true);
    expect(sealed(peers[0])).toBe(true);
  });
});
