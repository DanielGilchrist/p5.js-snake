import * as Assert from "../core/assert";
import * as Option from "../core/option";
import * as Invite from "../net/invite";
import * as Lan from "../net/lan";
import * as Prompt from "../render/scene";
import * as Mode from "./mode";

export const SOLO = "solo";
export const COMPUTER = "computer";
export const FRIEND = "friend";
export const ROOM = "room";
export const HOW = "how";
export const SETTINGS = "settings";

export type Entry =
  | typeof SOLO
  | typeof COMPUTER
  | typeof FRIEND
  | typeof ROOM
  | typeof HOW
  | typeof SETTINGS;

export const ENTRIES: readonly Entry[] = [SOLO, COMPUTER, FRIEND, ROOM, HOW, SETTINGS];

export const labelOf = (entry: Entry): string => {
  switch (entry) {
    case SOLO:
      return "Solo";
    case COMPUTER:
      return "Vs CPU";
    case FRIEND:
      return "Vs a friend";
    case ROOM:
      return "Over LAN";
    case HOW:
      return "How to play";
    case SETTINGS:
      return "Settings";
    default:
      return Assert.never(entry);
  }
};

export type Counts = {
  readonly computer: number;
  readonly room: number;
};

export const START: Counts = { computer: 1, room: 2 };

export type Range = {
  readonly fewest: number;
  readonly most: number;
};

const COMPUTERS: Range = { fewest: 1, most: Mode.MOST_PLAYERS - 1 };
const ROOMS: Range = { fewest: 2, most: Mode.MOST_PLAYERS };

const rangeOf = (entry: Entry): Option.Type<Range> => {
  switch (entry) {
    case COMPUTER:
      return Option.some(COMPUTERS);
    case ROOM:
      return Option.some(ROOMS);
    case SOLO:
    case FRIEND:
    case HOW:
    case SETTINGS:
      return Option.none;
    default:
      return Assert.never(entry);
  }
};

const seatsFor = (entry: Entry): Option.Type<Range> => {
  switch (entry) {
    case COMPUTER:
      return Option.some({ fewest: COMPUTERS.fewest + 1, most: COMPUTERS.most + 1 });
    case ROOM:
      return Option.some(ROOMS);
    case SOLO:
    case FRIEND:
    case HOW:
    case SETTINGS:
      return Option.none;
    default:
      return Assert.never(entry);
  }
};

const playersFor = (counts: Counts, entry: Entry): Option.Type<number> => {
  switch (entry) {
    case COMPUTER:
      return Option.some(counts.computer + 1);
    case ROOM:
      return Option.some(counts.room);
    case SOLO:
    case FRIEND:
    case HOW:
    case SETTINGS:
      return Option.none;
    default:
      return Assert.never(entry);
  }
};

const held = (range: Range, count: number): number =>
  Math.min(range.most, Math.max(range.fewest, count));

const stepped = (counts: Counts, entry: Entry, by: number): Counts => {
  const range = rangeOf(entry);

  if (!range.some) return counts;

  switch (entry) {
    case COMPUTER:
      return { ...counts, computer: held(range.value, counts.computer + by) };
    case ROOM:
      return { ...counts, room: held(range.value, counts.room + by) };
    case SOLO:
    case FRIEND:
    case HOW:
    case SETTINGS:
      return counts;
    default:
      return Assert.never(entry);
  }
};

export const ROOT = "root";
export const SETUP = "setup";

export type Where =
  | { readonly kind: typeof ROOT }
  | { readonly kind: typeof SETUP; readonly entry: Entry };

export type Place = {
  readonly where: Where;
  readonly cursor: number;
  readonly counts: Counts;
};

export const OPENING: Place = { where: { kind: ROOT }, cursor: 0, counts: START };

export const PLAYERS = "players";
export const BEGIN = "begin";
export const BACK = "back";

export type Line = typeof PLAYERS | typeof BEGIN | typeof BACK;

const SETUP_LINES: readonly Line[] = [PLAYERS, BEGIN, BACK];

const lineLabel = (line: Line): string => {
  switch (line) {
    case PLAYERS:
      return "Players";
    case BEGIN:
      return "Start";
    case BACK:
      return "Back";
    default:
      return Assert.never(line);
  }
};

export const PLAIN = "plain";
export const OPENS = "opens";
export const RETURNS = "returns";
export const COUNTED = "counted";

export type Seats = {
  readonly shown: number;
  readonly least: number;
  readonly most: number;
};

export type Slot =
  | { readonly kind: typeof PLAIN; readonly label: string }
  | { readonly kind: typeof OPENS; readonly label: string }
  | { readonly kind: typeof RETURNS; readonly label: string }
  | { readonly kind: typeof COUNTED; readonly label: string; readonly seats: Seats };

const rootSlot = (entry: Entry): Slot =>
  rangeOf(entry).some
    ? { kind: OPENS, label: labelOf(entry) }
    : { kind: PLAIN, label: labelOf(entry) };

const countedSlot = (entry: Entry, counts: Counts): Slot => {
  const playing = playersFor(counts, entry);
  const seats = seatsFor(entry);

  if (!playing.some || !seats.some) return { kind: PLAIN, label: lineLabel(PLAYERS) };

  return {
    kind: COUNTED,
    label: lineLabel(PLAYERS),
    seats: { shown: playing.value, least: seats.value.fewest, most: seats.value.most },
  };
};

const setupSlot = (entry: Entry, counts: Counts, line: Line): Slot => {
  switch (line) {
    case PLAYERS:
      return countedSlot(entry, counts);
    case BEGIN:
      return { kind: PLAIN, label: lineLabel(line) };
    case BACK:
      return { kind: RETURNS, label: lineLabel(line) };
    default:
      return Assert.never(line);
  }
};

export const slotsAt = (place: Place): readonly Slot[] => {
  switch (place.where.kind) {
    case ROOT:
      return ENTRIES.map((entry) => rootSlot(entry));
    case SETUP: {
      const { entry } = place.where;

      return SETUP_LINES.map((line) => setupSlot(entry, place.counts, line));
    }
    default:
      return Assert.never(place.where);
  }
};

export const headingOf = (place: Place): Option.Type<string> => {
  switch (place.where.kind) {
    case ROOT:
      return Option.none;
    case SETUP:
      return Option.some(labelOf(place.where.entry).toUpperCase());
    default:
      return Assert.never(place.where);
  }
};

const wrapped = (cursor: number, count: number): number =>
  count === 0 ? 0 : ((cursor % count) + count) % count;

export const entryAt = (cursor: number): Entry => ENTRIES[wrapped(cursor, ENTRIES.length)] ?? SOLO;

const lineAt = (cursor: number): Line => SETUP_LINES[wrapped(cursor, SETUP_LINES.length)] ?? BEGIN;

export const moved = (place: Place, by: number): Place => ({
  ...place,
  cursor: wrapped(place.cursor + by, slotsAt(place).length),
});

export const nudged = (place: Place, by: number): Place => {
  if (place.where.kind !== SETUP || lineAt(place.cursor) !== PLAYERS) return place;

  return { ...place, counts: stepped(place.counts, place.where.entry, by) };
};

const KEPT: readonly string[] = [Mode.LONG, Mode.PROBE, Mode.BOT, Lan.RELAY];

type Param = readonly [string, string];

const carried = (here: string): readonly Param[] =>
  KEPT.flatMap((name): readonly Param[] => {
    const value = Invite.valued(here, name);

    return value.some ? [[name, value.value]] : [];
  });

const query = (params: readonly Param[]): string =>
  params
    .map(([name, value]) => (value === "" ? name : `${name}=${encodeURIComponent(value)}`))
    .join("&");

const linkTo = (here: string, wanted: readonly Param[]): string => {
  const url = new URL(here);

  url.hash = "";
  url.search = query([...wanted, ...carried(here)]);

  return url.toString();
};

export const home = (here: string): string => linkTo(here, []);

const hrefFor = (here: string, entry: Entry, counts: Counts): string => {
  switch (entry) {
    case SOLO:
      return linkTo(here, [[Mode.SOLO, ""]]);
    case COMPUTER:
      return linkTo(here, [[Mode.CPU, `${counts.computer}`]]);
    case FRIEND:
      return linkTo(here, [[Mode.FRIEND, ""]]);
    case ROOM:
      return linkTo(here, [
        [Mode.HOST, ""],
        [Mode.PLAYERS, `${counts.room}`],
      ]);
    case HOW:
    case SETTINGS:
      return home(here);
    default:
      return Assert.never(entry);
  }
};

export const GO = "go";
export const AT = "at";
export const SHOW_HOW = "showHow";
export const SHOW_SETTINGS = "showSettings";

export type Outcome =
  | { readonly kind: typeof GO; readonly href: string }
  | { readonly kind: typeof AT; readonly place: Place }
  | { readonly kind: typeof SHOW_HOW }
  | { readonly kind: typeof SHOW_SETTINGS };

const fromRoot = (here: string, place: Place): Outcome => {
  const entry = entryAt(place.cursor);

  switch (entry) {
    case COMPUTER:
    case ROOM:
      return { kind: AT, place: { ...place, where: { kind: SETUP, entry }, cursor: 0 } };
    case SOLO:
    case FRIEND:
      return { kind: GO, href: hrefFor(here, entry, place.counts) };
    case HOW:
      return { kind: SHOW_HOW };
    case SETTINGS:
      return { kind: SHOW_SETTINGS };
    default:
      return Assert.never(entry);
  }
};

export const backed = (place: Place): Place => {
  switch (place.where.kind) {
    case ROOT:
      return place;
    case SETUP:
      return { ...place, where: { kind: ROOT }, cursor: ENTRIES.indexOf(place.where.entry) };
    default:
      return Assert.never(place.where);
  }
};

const fromSetup = (here: string, place: Place, entry: Entry): Outcome => {
  if (lineAt(place.cursor) === BACK) return { kind: AT, place: backed(place) };

  return { kind: GO, href: hrefFor(here, entry, place.counts) };
};

export const chosen = (here: string, place: Place): Outcome => {
  switch (place.where.kind) {
    case ROOT:
      return fromRoot(here, place);
    case SETUP:
      return fromSetup(here, place, place.where.entry);
    default:
      return Assert.never(place.where);
  }
};

const rootHint = (prompt: Prompt.Prompt): string => {
  switch (prompt) {
    case Prompt.KEYS:
      return "↑↓ choose   ENTER to pick";
    case Prompt.TOUCH:
      return "Tap to pick";
    default:
      return Assert.never(prompt);
  }
};

const setupHint = (prompt: Prompt.Prompt): string => {
  switch (prompt) {
    case Prompt.KEYS:
      return "←→ players   ENTER to start   ESC to go back";
    case Prompt.TOUCH:
      return "Tap the arrows, then Start";

    default:
      return Assert.never(prompt);
  }
};

export const hintFor = (place: Place, prompt: Prompt.Prompt): string => {
  switch (place.where.kind) {
    case ROOT:
      return rootHint(prompt);
    case SETUP:
      return setupHint(prompt);
    default:
      return Assert.never(place.where);
  }
};
