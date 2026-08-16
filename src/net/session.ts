import * as Geometry from "../core/geometry";
import * as Option from "../core/option";
import * as Players from "../core/players";
import type * as Code from "./code";
import * as Lan from "./lan";
import * as Lockstep from "./lockstep";
import * as Roster from "./roster";

export type Config = {
  readonly cols: number;
  readonly rows: number;
  readonly seed: number;
};

export const HOST = "host";
export const GUEST = "guest";

export type Role = typeof HOST | typeof GUEST;

const LOBBY = "lobby";
const PLAYING = "playing";
const TROUBLE = "trouble";

export const SIGNALLING = "signalling";
export const HOST_GONE = "hostGone";
export const ALL_GONE = "allGone";

export type Why = typeof SIGNALLING | typeof HOST_GONE | typeof ALL_GONE;

export type Seated = {
  readonly kind: typeof PLAYING;
  readonly config: Config;
  readonly roster: Roster.Type;
};

export type Trouble = {
  readonly kind: typeof TROUBLE;
  readonly why: Why;
  readonly detail: string;
};

export type Stage = { readonly kind: typeof LOBBY } | Seated | Trouble;

export const isSeated = (stage: Stage): stage is Seated => stage.kind === PLAYING;

export const isTrouble = (stage: Stage): stage is Trouble => stage.kind === TROUBLE;

export type Lobby = {
  readonly size: number;
  readonly here: number;
  readonly waiting: boolean;
};

export type Drop = {
  readonly seat: Players.Id;
  readonly beat: number;
};

const WINDOW = 16;

const ROOM = "rm";
const START = "run";
const REMATCH = "rmt";
const READY = "rdy";
const TURNS = "trn";
const LEFT = "out";

type Note =
  | { readonly kind: typeof ROOM; readonly size: number; readonly roster: string[] }
  | {
      readonly kind: typeof START;
      readonly config: Config;
      readonly roster: string[];
    }
  | { readonly kind: typeof REMATCH }
  | { readonly kind: typeof READY; readonly ready: boolean }
  | { readonly kind: typeof LEFT; readonly seat: number; readonly beat: number }
  | {
      readonly kind: typeof TURNS;
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

const DIRECTIONS = new Set<string>(Geometry.DIRECTIONS);

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

const rosterOf = (raw: unknown): Roster.Type =>
  Array.isArray(raw) ? raw.filter((who): who is string => typeof who === "string") : [];

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
  readonly missing: readonly Players.Id[];
  readonly sealed: boolean;
};

export type Session = {
  readonly role: Role;
  readonly seat: () => Players.Id;
  readonly players: () => number;
  readonly stage: () => Stage;
  readonly lobby: () => Lobby;
  readonly resize: (by: number) => void;
  readonly start: () => void;
  readonly record: (tick: number, turns: readonly Geometry.Direction[], mark: number) => void;
  readonly markAt: (tick: number) => Option.Type<number>;
  readonly flush: (tick: number) => void;
  readonly turnsAt: (tick: number) => Option.Type<readonly Lockstep.Seated[]>;
  readonly dropsAt: (tick: number) => readonly Players.Id[];
  readonly noticeLeaving: (beat: number) => void;
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

export const join = (
  code: Code.Type,
  role: Role,
  offer: () => Config,
  wanted: number,
  href: string,
): Session => {
  let trouble: Option.Type<Trouble> = Option.none;

  const upset = (why: Why, detail: string): void => {
    if (trouble.some) return;

    trouble = Option.some({ kind: TROUBLE, why, detail });
  };

  const link = Lan.enter(code, href, (fault) => {
    upset(SIGNALLING, fault.why);
  });
  const me = link.me;

  let size = Roster.clamp(wanted);
  let roster: Roster.Type = role === HOST ? [me] : [];
  let playing: Option.Type<Seated> = Option.none;
  let asked = false;
  let heard = false;

  const inbox = new Map<string, Map<number, readonly Geometry.Direction[]>>();
  const outbox = new Map<number, readonly Geometry.Direction[]>();
  const myMarks = new Map<number, number>();
  const theirMarks = new Map<number, number>();
  const gone = new Map<number, readonly Players.Id[]>();
  const ready = new Set<string>();
  const present = new Set<string>();
  const ahead = new Set<string>();

  let round = 0;
  let sending = false;

  const wire = link.room.makeAction<Note>("snake");

  const post = (payload: Note): Promise<void> => wire.send(payload);

  const seatNow = (): Players.Id =>
    Option.getOrElse(
      Roster.seatOf(playing.some ? playing.value.roster : roster, me),
      Players.FIRST,
    );

  const others = (): Roster.Type => {
    if (!playing.some) return [];

    return playing.value.roster.filter((who) => who !== me && !departed.has(who));
  };

  const departed = new Set<string>();

  const begin = (): void => {
    if (role !== HOST || playing.some) return;
    if (roster.length < Roster.FEWEST) return;

    const seats = Roster.seated(roster, size);
    const config = offer();

    playing = Option.some({ kind: PLAYING, config, roster: seats });
    void post({ kind: START, config, roster: [...seats] });
  };

  const tellRoom = (): void => {
    if (role !== HOST) return;

    void post({ kind: ROOM, size, roster: [...roster] });
  };

  const runsFrom = (who: string, tick: number): Option.Type<readonly Geometry.Direction[]> => {
    const held = inbox.get(who)?.get(tick);

    return held === undefined ? Option.none : Option.some(held);
  };

  wire.onMessage = (data, { peerId: from }) => {
    if (typeof data !== "object" || data === null) return;

    const held = data as Record<string, unknown>;

    if (held["kind"] === ROOM) {
      if (role === HOST) return;

      size = Roster.clamp(typeof held["size"] === "number" ? held["size"] : Roster.FEWEST);
      roster = rosterOf(held["roster"]);

      return;
    }

    if (held["kind"] === START) {
      const config = configOf(held["config"]);
      const seats = rosterOf(held["roster"]);

      if (!config.some || !Roster.holds(seats, me)) return;

      roster = seats;
      playing = Option.some({ kind: PLAYING, config: config.value, roster: seats });

      return;
    }

    if (held["kind"] === READY) {
      if (held["ready"] === true) ready.add(from);
      else ready.delete(from);

      return;
    }

    if (held["kind"] === REMATCH) {
      heard = true;

      return;
    }

    if (held["kind"] === LEFT) {
      const seat = held["seat"];
      const beat = held["beat"];

      if (typeof seat !== "number" || typeof beat !== "number") return;

      noteLeaving(Players.id(seat), beat);

      return;
    }

    if (held["kind"] !== TURNS) return;

    onTurns(from, held["body"]);
  };

  const noteLeaving = (seat: Players.Id, beat: number): void => {
    const already = gone.get(beat) ?? [];

    if (already.includes(seat)) return;

    gone.set(beat, [...already, seat]);

    const who = playing.some ? playing.value.roster[seat] : undefined;

    if (who !== undefined) departed.add(who);
  };

  const onTurns = (from: string, data: unknown): void => {
    const parsed = packetOf(data);

    if (!parsed.some) return;

    if (parsed.value.round !== round) {
      if (parsed.value.round > round) ahead.add(from);

      return;
    }

    const held = inbox.get(from) ?? new Map<number, readonly Geometry.Direction[]>();

    parsed.value.runs.forEach((run, offset) => {
      held.set(parsed.value.base + offset, run);
    });

    inbox.set(from, held);

    parsed.value.marks.forEach((mark, offset) => {
      theirMarks.set(parsed.value.base + offset, mark);
    });
  };

  link.room.onPeerJoin = (who) => {
    present.add(who);

    if (role !== HOST) return;
    if (playing.some) return;

    roster = Roster.joined(roster, who);
    tellRoom();

    if (Roster.full(roster, size)) begin();
  };

  const hosted = (who: string): boolean =>
    (playing.some ? playing.value.roster[0] : roster[0]) === who;

  link.room.onPeerLeave = (who) => {
    ready.delete(who);
    present.delete(who);

    if (role !== HOST && hosted(who)) {
      upset(HOST_GONE, "the host closed the room");

      return;
    }

    if (playing.some) {
      leaving.add(who);

      if (present.size === 0) upset(ALL_GONE, "everyone else left the room");

      return;
    }

    if (role !== HOST) return;

    roster = Roster.left(roster, who);
    tellRoom();
  };

  const leaving = new Set<string>();

  return {
    role,
    seat: seatNow,
    players: () => (playing.some ? playing.value.roster.length : Roster.clamp(size)),
    stage: () => {
      if (trouble.some) return trouble.value;
      if (playing.some) return playing.value;

      return { kind: LOBBY };
    },
    lobby: () => ({
      size: Roster.clamp(size),
      here: Math.max(roster.length, role === HOST ? 1 : 0),
      waiting: role !== HOST,
    }),
    resize: (by) => {
      if (role !== HOST || playing.some) return;

      size = Roster.clamp(size + by);
      tellRoom();
    },
    start: begin,
    record: (tick, moves, mark) => {
      outbox.set(tick, moves);
      myMarks.set(tick, mark);

      for (const at of outbox.keys()) {
        if (at < tick - WINDOW) outbox.delete(at);
      }

      for (const at of myMarks.keys()) {
        if (at < tick - WINDOW) myMarks.delete(at);
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

      void post({ kind: TURNS, body: { round, base, runs, marks } }).finally(() => {
        sending = false;
      });
    },
    turnsAt: (tick) => {
      const seats = others();
      const found: Lockstep.Seated[] = [];

      for (const who of seats) {
        const runs = runsFrom(who, tick);
        const seat = Roster.seatOf(playing.some ? playing.value.roster : roster, who);

        if (!runs.some || !seat.some) return Option.none;

        found.push({ seat: seat.value, runs: runs.value });
      }

      return Option.some(found);
    },
    dropsAt: (tick) => gone.get(tick) ?? [],
    noticeLeaving: (beat) => {
      for (const who of leaving) {
        const seat = playing.some ? Roster.seatOf(playing.value.roster, who) : Option.none;

        leaving.delete(who);

        if (!seat.some) continue;

        noteLeaving(seat.value, beat);
        void post({ kind: LEFT, seat: Number(seat.value), beat });
      }
    },
    beginRound: (next) => {
      round = next;
      inbox.clear();
      outbox.clear();
      myMarks.clear();
      theirMarks.clear();
      ready.clear();
      ahead.clear();
    },
    askRematch: () => {
      asked = true;
      void post({ kind: REMATCH });
    },
    held: () => [...(inbox.get(others()[0] ?? "")?.keys() ?? [])],
    declareReady: () => {
      ready.add(me);
      void post({ kind: READY, ready: true });
    },
    readiness: () => {
      const seats = playing.some ? playing.value.roster : roster;
      const missing = others()
        .filter((who) => !ready.has(who) && !ahead.has(who))
        .flatMap((who) => {
          const seat = Roster.seatOf(seats, who);

          return seat.some ? [seat.value] : [];
        });

      return {
        here: ready.has(me),
        missing,
        sealed: ready.has(me) && missing.length === 0,
      };
    },
    nudgeReady: () => {
      void post({ kind: READY, ready: ready.has(me) });
    },
    askedRematch: () => asked,
    heardRematch: () => heard,
    bothWantRematch: () => asked && heard,
    clearRematch: () => {
      asked = false;
      heard = false;
    },
    leave: link.leave,
  };
};
