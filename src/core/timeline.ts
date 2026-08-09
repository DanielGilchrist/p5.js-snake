import type * as Event from "./event";
import * as Game from "./game";

export type Timeline<B> = {
  readonly initial: Game.State<B>;
  readonly log: Event.Type<B>[];
};

export type Cursor<B> = {
  readonly state: Game.State<B>;
  readonly index: number;
  readonly tick: number;
};

export const start = <B>(initial: Game.State<B>): Timeline<B> => ({ initial, log: [] });

export const record = <B>(timeline: Timeline<B>, events: readonly Event.Type<B>[]): void => {
  timeline.log.push(...events);
};

const ticks = <B>(timeline: Timeline<B>): number =>
  timeline.log.reduce((count, event) => (event.kind === "moved" ? count + 1 : count), 0);

export const cursor = <B>(timeline: Timeline<B>, state: Game.State<B>): Cursor<B> => ({
  state,
  index: timeline.log.length,
  tick: ticks(timeline),
});

export const back = <B>(timeline: Timeline<B>, from: Cursor<B>): Cursor<B> => {
  let { state, index, tick } = from;

  while (index > 0) {
    const event = timeline.log[index - 1];

    if (event === undefined) break;

    state = Game.revert(state, event);
    index -= 1;

    if (event.kind === "moved") {
      tick -= 1;
      break;
    }
  }

  return { state, index, tick };
};
