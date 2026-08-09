import type * as Geometry from "../geometry";

export type Type =
  | { readonly kind: "tick" }
  | { readonly kind: "turn"; readonly direction: Geometry.Direction }
  | { readonly kind: "togglePause" }
  | { readonly kind: "restart" };

export const turn = (direction: Geometry.Direction): Type => ({ kind: "turn", direction });

export const tick = { kind: "tick" } as const;

export const togglePause = { kind: "togglePause" } as const;

export const restart = { kind: "restart" } as const;
