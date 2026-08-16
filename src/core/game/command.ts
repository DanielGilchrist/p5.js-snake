import type * as Geometry from "../geometry";
import * as Players from "../players";

export const TICK = "tick";
export const TURN = "turn";
export const TOGGLE_PAUSE = "togglePause";
export const RESTART = "restart";

export type Type =
  | { readonly kind: typeof TICK }
  | {
      readonly kind: typeof TURN;
      readonly player: Players.Id;
      readonly direction: Geometry.Direction;
    }
  | { readonly kind: typeof TOGGLE_PAUSE }
  | { readonly kind: typeof RESTART };

export const turn = (player: Players.Id, direction: Geometry.Direction): Type => ({
  kind: TURN,
  player,
  direction,
});

export const steer = (direction: Geometry.Direction): Type => turn(Players.FIRST, direction);

export const tick = { kind: TICK } as const;

export const togglePause = { kind: TOGGLE_PAUSE } as const;

export const restart = { kind: RESTART } as const;
