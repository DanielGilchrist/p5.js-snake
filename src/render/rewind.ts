import type * as Event from "../core/event";
import type * as Game from "../core/game";
import * as Timeline from "../core/timeline";
import * as Scene from "./scene";
import * as Units from "./units";

const START_SPEED = 5;
const TOP_SPEED = 190;
const ACCELERATION = 110;

type Profile = {
  readonly rampSeconds: number;
  readonly rampTicks: number;
  readonly cruiseSeconds: number;
  readonly peakSpeed: number;
  readonly seconds: number;
};

const profileFor = (ticks: number): Profile => {
  const fullRampSeconds = (TOP_SPEED - START_SPEED) / ACCELERATION;
  const fullRampTicks = START_SPEED * fullRampSeconds + (ACCELERATION * fullRampSeconds ** 2) / 2;

  if (ticks <= fullRampTicks * 2) {
    const half = ticks / 2;
    const peakSpeed = Math.sqrt(START_SPEED ** 2 + 2 * ACCELERATION * half);
    const rampSeconds = (peakSpeed - START_SPEED) / ACCELERATION;

    return { rampSeconds, rampTicks: half, cruiseSeconds: 0, peakSpeed, seconds: rampSeconds * 2 };
  }

  const cruiseSeconds = (ticks - fullRampTicks * 2) / TOP_SPEED;

  return {
    rampSeconds: fullRampSeconds,
    rampTicks: fullRampTicks,
    cruiseSeconds,
    peakSpeed: TOP_SPEED,
    seconds: fullRampSeconds * 2 + cruiseSeconds,
  };
};

const travelled = (profile: Profile, seconds: number): number => {
  if (seconds <= profile.rampSeconds) {
    return START_SPEED * seconds + (ACCELERATION * seconds ** 2) / 2;
  }

  const cruised = seconds - profile.rampSeconds;

  if (cruised <= profile.cruiseSeconds) {
    return profile.rampTicks + profile.peakSpeed * cruised;
  }

  const slowing = Math.min(cruised - profile.cruiseSeconds, profile.rampSeconds);

  return (
    profile.rampTicks +
    profile.peakSpeed * profile.cruiseSeconds +
    (profile.peakSpeed * slowing - (ACCELERATION * slowing ** 2) / 2)
  );
};

const SETTLED = Units.millis(0);

export type Playback<B> = {
  readonly since: Units.Millis;
  readonly profile: Profile;
  readonly total: number;
  readonly cursor: Timeline.Cursor<B>;
  readonly ahead: Timeline.Cursor<B>;
};

const withCursors = <B>(
  playback: Playback<B>,
  cursor: Timeline.Cursor<B>,
  ahead: Timeline.Cursor<B>,
): Playback<B> => ({ ...playback, cursor, ahead });

export type Frame<B> =
  | {
      readonly kind: "drawing";
      readonly playback: Playback<B>;
      readonly scene: Scene.Scene<B>;
      readonly undone: readonly Event.Type<B>[];
    }
  | { readonly kind: "finished" };

const finished = { kind: "finished" } as const;

const drawing = <B>(
  playback: Playback<B>,
  scene: Scene.Scene<B>,
  undone: readonly Event.Type<B>[],
): Frame<B> => ({ kind: "drawing", playback, scene, undone });

export const worthWatching = <B>(playback: Playback<B>): boolean => playback.total > 1;

export const begin = <B>(
  timeline: Timeline.Timeline<B>,
  state: Game.State<B>,
  now: Units.Millis,
): Playback<B> => {
  const cursor = Timeline.cursor(timeline, state);

  return {
    since: now,
    profile: profileFor(cursor.tick),
    total: cursor.tick,
    cursor,
    ahead: cursor,
  };
};

export const frame = <B>(
  playback: Playback<B>,
  timeline: Timeline.Timeline<B>,
  now: Units.Millis,
): Frame<B> => {
  const elapsed = (now - playback.since) / (playback.profile.seconds * 1000);

  if (elapsed >= 1) return finished;

  const clamped = Math.max(0, elapsed);
  const position = Math.max(
    0,
    playback.total - travelled(playback.profile, clamped * playback.profile.seconds),
  );
  const target = Math.floor(position);

  let { cursor, ahead } = playback;
  const undone: Event.Type<B>[] = [];

  while (cursor.tick > target) {
    const step = Timeline.back(timeline, cursor);

    ahead = cursor;
    cursor = step.cursor;
    undone.push(...step.undone);
  }

  return drawing(
    withCursors(playback, cursor, ahead),
    Scene.of(ahead.state, cursor.state.world.players, position - target, SETTLED),
    undone,
  );
};
