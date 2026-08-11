import type * as Geometry from "../core/geometry";
import * as Option from "../core/option";
import * as Players from "../core/players";
import type * as Code from "./code";
import * as Handshake from "./handshake";
import * as Lan from "./lan";

export type Config = {
  readonly cols: number;
  readonly rows: number;
  readonly seed: number;
};

export type Role = "host" | "guest";

export type Stage =
  | { readonly kind: "waiting" }
  | { readonly kind: "ready"; readonly config: Config }
  | { readonly kind: "lost" };

const WINDOW = 16;

type Note =
  | { readonly kind: "cfg"; readonly config: Config }
  | { readonly kind: "rmt" }
  | { readonly kind: "rdy"; readonly ready: boolean }
  | {
      readonly kind: "trn";
      readonly body: {
        readonly round: number;
        readonly base: number;
        readonly runs: string[][];
        readonly marks: number[];
      };
    };

type Packet = {
  readonly round: number;
  readonly base: number;
  readonly runs: readonly (readonly Geometry.Direction[])[];
  readonly marks: readonly number[];
};

const DIRECTIONS = new Set<string>(["up", "down", "left", "right"]);

const isDirection = (raw: unknown): raw is Geometry.Direction =>
  typeof raw === "string" && DIRECTIONS.has(raw);

const configOf = (raw: unknown): Option.Type<Config> => {
  if (typeof raw !== "object" || raw === null) return Option.none;

  const held = raw as Record<string, unknown>;
  const { cols, rows, seed } = held;

  if (typeof cols !== "number" || typeof rows !== "number" || typeof seed !== "number") {
    return Option.none;
  }

  return Option.some({ cols, rows, seed });
};

const packetOf = (raw: unknown): Option.Type<Packet> => {
  if (typeof raw !== "object" || raw === null) return Option.none;

  const held = raw as Record<string, unknown>;
  const { round, base, runs, marks } = held;

  if (typeof round !== "number" || typeof base !== "number" || !Array.isArray(runs)) {
    return Option.none;
  }

  return Option.some({
    round,
    base,
    runs: runs.map((run) => (Array.isArray(run) ? run.filter(isDirection) : [])),
    marks: Array.isArray(marks) ? marks.map((mark) => (typeof mark === "number" ? mark : 0)) : [],
  });
};

export type Readiness = {
  readonly here: boolean;
  readonly there: boolean;
  readonly sealed: boolean;
};

export type Session = {
  readonly role: Role;
  readonly seat: Players.Id;
  readonly rival: Players.Id;
  readonly stage: () => Stage;
  readonly record: (tick: number, turns: readonly Geometry.Direction[], mark: number) => void;
  readonly markAt: (tick: number) => Option.Type<number>;
  readonly flush: (tick: number) => void;
  readonly turnsAt: (tick: number) => Option.Type<readonly Geometry.Direction[]>;
  readonly beginRound: (round: number) => void;
  readonly askRematch: () => void;
  readonly held: () => readonly number[];
  readonly declareReady: () => void;
  readonly readiness: () => Readiness;
  readonly nudgeReady: () => void;
  readonly askedRematch: () => boolean;
  readonly heardRematch: () => boolean;
  readonly bothWantRematch: () => boolean;
  readonly clearRematch: () => void;
  readonly leave: () => Promise<void>;
};

export const join = (code: Code.Type, role: Role, offer: () => Config): Session => {
  const table = Lan.sit(code);
  const seat = role === "host" ? Players.FIRST : Players.id(1);

  let agreed: Option.Type<Config> = role === "host" ? Option.some(offer()) : Option.none;
  let peers = 0;
  let lost = false;
  let asked = false;
  let heard = false;

  const inbox = new Map<number, readonly Geometry.Direction[]>();
  const outbox = new Map<number, readonly Geometry.Direction[]>();
  const myMarks = new Map<number, number>();
  const theirMarks = new Map<number, number>();

  let round = 0;
  let sending = false;
  let readyHere = false;
  let readyThere = false;
  let playingThere = false;

  const wire = table.room.makeAction<Note>("snake");

  const post = (payload: Note): Promise<void> => wire.send(payload);

  wire.onMessage = (data) => {
    if (typeof data !== "object" || data === null) return;

    const held = data as Record<string, unknown>;

    if (held["kind"] === "cfg") {
      const parsed = configOf(held["config"]);

      if (parsed.some && role === "guest") agreed = parsed;

      return;
    }

    if (held["kind"] === "rdy") {
      readyThere = held["ready"] === true;

      return;
    }

    if (held["kind"] === "rmt") {
      heard = true;

      return;
    }

    if (held["kind"] !== "trn") return;

    onTurns(held["body"]);
  };

  const onTurns = (data: unknown): void => {
    const parsed = packetOf(data);

    if (!parsed.some) return;

    if (parsed.value.round !== round) {
      if (parsed.value.round > round) playingThere = true;

      return;
    }

    parsed.value.runs.forEach((run, offset) => {
      inbox.set(parsed.value.base + offset, run);
    });

    parsed.value.marks.forEach((mark, offset) => {
      theirMarks.set(parsed.value.base + offset, mark);
    });
  };

  table.room.onPeerJoin = () => {
    peers += 1;
    lost = false;

    if (role === "host" && agreed.some) void post({ kind: "cfg", config: { ...agreed.value } });
  };

  table.room.onPeerLeave = () => {
    peers = Math.max(0, peers - 1);
    if (peers === 0) lost = true;
  };

  return {
    role,
    seat,
    rival: seat === Players.FIRST ? Players.id(1) : Players.FIRST,
    stage: () => {
      if (lost) return { kind: "lost" };
      if (peers === 0 || !agreed.some) return { kind: "waiting" };

      return { kind: "ready", config: agreed.value };
    },
    record: (tick, moves, mark) => {
      outbox.set(tick, moves);
      myMarks.set(tick, mark);

      for (const held of outbox.keys()) {
        if (held < tick - WINDOW) outbox.delete(held);
      }

      for (const held of myMarks.keys()) {
        if (held < tick - WINDOW) myMarks.delete(held);
      }
    },
    markAt: (tick) => {
      const found = theirMarks.get(tick);

      return found === undefined ? Option.none : Option.some(found);
    },
    flush: (tick) => {
      const base = Math.max(0, tick - WINDOW);
      const runs: Geometry.Direction[][] = [];
      const marks: number[] = [];

      for (let at = base; at <= tick; at++) {
        runs.push([...(outbox.get(at) ?? [])]);
        marks.push(myMarks.get(at) ?? 0);
      }

      if (sending) return;

      sending = true;

      void post({ kind: "trn", body: { round, base, runs, marks } }).finally(() => {
        sending = false;
      });
    },
    turnsAt: (tick) => {
      const found = inbox.get(tick);

      return found === undefined ? Option.none : Option.some(found);
    },
    beginRound: (next) => {
      round = next;
      inbox.clear();
      outbox.clear();
      myMarks.clear();
      theirMarks.clear();
      readyHere = false;
      readyThere = false;
      playingThere = false;
    },
    askRematch: () => {
      asked = true;
      void post({ kind: "rmt" });
    },
    held: () => [...inbox.keys()],
    declareReady: () => {
      readyHere = true;
      void post({ kind: "rdy", ready: true });
    },
    readiness: () => ({
      here: readyHere,
      there: readyThere || playingThere,
      sealed: Handshake.settled(Handshake.signals(readyHere, readyThere, playingThere)),
    }),
    nudgeReady: () => {
      void post({ kind: "rdy", ready: readyHere });
    },
    askedRematch: () => asked,
    heardRematch: () => heard,
    bothWantRematch: () => asked && heard,
    clearRematch: () => {
      asked = false;
      heard = false;
    },
    leave: table.leave,
  };
};
