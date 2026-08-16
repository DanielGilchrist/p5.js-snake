import * as Event from "./event";
import * as Game from "./game";

export type Entry<B> = {
  readonly events: readonly Event.Type<B>[];
  readonly ticked: boolean;
};

export type Timeline<B> = {
  readonly initial: Game.State<B>;
  readonly entries: Entry<B>[];
};

export type Cursor<B> = {
  readonly state: Game.State<B>;
  readonly index: number;
  readonly tick: number;
};

const cursorAt = <B>(state: Game.State<B>, index: number, tick: number): Cursor<B> => ({
  state,
  index,
  tick,
});

export const start = <B>(initial: Game.State<B>): Timeline<B> => ({ initial, entries: [] });

const ticking = <B>(events: readonly Event.Type<B>[]): boolean =>
  events.some((event) => event.kind === Event.MOVED);

export const record = <B>(timeline: Timeline<B>, events: readonly Event.Type<B>[]): void => {
  if (events.length === 0) return;

  timeline.entries.push({ events, ticked: ticking(events) });
};

const ticks = <B>(timeline: Timeline<B>): number =>
  timeline.entries.reduce((count, entry) => (entry.ticked ? count + 1 : count), 0);

export const cursor = <B>(timeline: Timeline<B>, state: Game.State<B>): Cursor<B> =>
  cursorAt(state, timeline.entries.length, ticks(timeline));

export type Step<B> = {
  readonly cursor: Cursor<B>;
  readonly undone: readonly Event.Type<B>[];
};

export const back = <B>(timeline: Timeline<B>, from: Cursor<B>): Step<B> => {
  let { state, index, tick } = from;
  const undone: Event.Type<B>[] = [];

  while (index > 0) {
    const entry = timeline.entries[index - 1];

    if (entry === undefined) break;

    for (let i = entry.events.length - 1; i >= 0; i--) {
      const event = entry.events[i];

      if (event === undefined) continue;

      state = Game.revert(state, event);
      undone.push(event);
    }

    index -= 1;

    if (entry.ticked) {
      tick -= 1;
      break;
    }
  }

  return { cursor: cursorAt(state, index, tick), undone };
};
