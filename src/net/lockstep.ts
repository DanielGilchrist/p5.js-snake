import type * as Geometry from "../core/geometry";
import * as Option from "../core/option";

export type Waiting = {
  readonly beat: number;
  readonly posted: number;
  readonly queued: readonly Geometry.Direction[];
  readonly committed: readonly Geometry.Direction[];
};

export const COMMIT = "commit";
export const STALL = "stall";
export const ADVANCE = "advance";

export type Turn =
  | {
      readonly kind: typeof COMMIT;
      readonly beat: number;
      readonly committed: readonly Geometry.Direction[];
      readonly next: Waiting;
    }
  | { readonly kind: typeof STALL }
  | {
      readonly kind: typeof ADVANCE;
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
      kind: COMMIT,
      beat: of.beat,
      committed: of.queued,
      next: { ...of, posted: of.beat, committed: of.queued, queued: [] },
    };
  }

  if (!theirs.some) return { kind: STALL };

  return {
    kind: ADVANCE,
    mine: of.committed,
    theirs: theirs.value,
    next: { beat: of.beat + 1, posted: of.posted, queued: of.queued, committed: [] },
  };
};
