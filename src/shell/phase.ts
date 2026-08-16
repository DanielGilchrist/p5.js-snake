import type * as Rewind from "../render/rewind";
import type * as Units from "../render/units";

const WAITING = "ready";
const COUNTING = "counting";
const RUNNING = "live";
const REWINDING = "rewinding";
const SETTINGS = "settings";
const HELPING = "help";
const FROZE = "frozen";

export type Counting = { readonly kind: typeof COUNTING; readonly until: Units.Millis };

export type Rewinding<B> = {
  readonly kind: typeof REWINDING;
  readonly playback: Rewind.Playback<B>;
};

export type Settings = { readonly kind: typeof SETTINGS; readonly cursor: number };

export type Phase<B> =
  | { readonly kind: typeof WAITING }
  | Counting
  | { readonly kind: typeof RUNNING }
  | Rewinding<B>
  | Settings
  | { readonly kind: typeof HELPING }
  | { readonly kind: typeof FROZE };

export const READY = { kind: WAITING } as const;

export const LIVE = { kind: RUNNING } as const;

export const HELP = { kind: HELPING } as const;

export const FROZEN = { kind: FROZE } as const;

export const counting = <B>(until: Units.Millis): Phase<B> => ({ kind: COUNTING, until });

export const rewinding = <B>(playback: Rewind.Playback<B>): Phase<B> => ({
  kind: REWINDING,
  playback,
});

export const settings = <B>(cursor: number): Phase<B> => ({ kind: SETTINGS, cursor });

export const isCounting = <B>(phase: Phase<B>): phase is Counting => phase.kind === COUNTING;

export const isRewinding = <B>(phase: Phase<B>): phase is Rewinding<B> => phase.kind === REWINDING;

export const isSettings = <B>(phase: Phase<B>): phase is Settings => phase.kind === SETTINGS;
