import type * as Geometry from "../geometry";
import * as Players from "../players";

export type Type =
  | { readonly kind: "tick" }
  | {
      readonly kind: "turn";
      readonly player: Players.Id;
      readonly direction: Geometry.Direction;
    }
  | { readonly kind: "togglePause" }
  | { readonly kind: "restart" };

export const turn = (player: Players.Id, direction: Geometry.Direction): Type => ({
  kind: "turn",
  player,
  direction,
});

export const steer = (direction: Geometry.Direction): Type => turn(Players.FIRST, direction);

export const tick = { kind: "tick" } as const;

export const togglePause = { kind: "togglePause" } as const;

export const restart = { kind: "restart" } as const;
