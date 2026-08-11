import type * as Geometry from "../core/geometry";
import * as Option from "../core/option";

export type Waiting = {
  readonly beat: number;
  readonly posted: number;
  readonly queued: readonly Geometry.Direction[];
  readonly committed: readonly Geometry.Direction[];
};

export type Turn =
  | {
      readonly kind: "commit";
      readonly beat: number;
      readonly committed: readonly Geometry.Direction[];
      readonly next: Waiting;
    }
  | { readonly kind: "stall" }
  | {
      readonly kind: "advance";
      readonly mine: readonly Geometry.Direction[];
      readonly theirs: readonly Geometry.Direction[];
      readonly next: Waiting;
    };

export const waiting = (beat: number): Waiting => ({
  beat,
  posted: -1,
  queued: [],
  committed: [],
});

export const pressed = (of: Waiting, direction: Geometry.Direction): Waiting => ({
  ...of,
  queued: [...of.queued, direction],
});

export const step = (of: Waiting, theirs: Option.Type<readonly Geometry.Direction[]>): Turn => {
  if (of.posted !== of.beat) {
    return {
      kind: "commit",
      beat: of.beat,
      committed: of.queued,
      next: { ...of, posted: of.beat, committed: of.queued, queued: [] },
    };
  }

  if (!theirs.some) return { kind: "stall" };

  return {
    kind: "advance",
    mine: of.committed,
    theirs: theirs.value,
    next: { beat: of.beat + 1, posted: of.posted, queued: of.queued, committed: [] },
  };
};
