import * as Assert from "./assert";
import type * as Game from "./game";
import type * as Geometry from "./geometry";
import * as Option from "./option";

const BINDINGS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  k: "up",
  j: "down",
  h: "left",
  l: "right",
} as const satisfies Record<string, Geometry.Direction>;

const PAUSE = "p";

type Bound = keyof typeof BINDINGS;

const isBound = (raw: string): raw is Bound => Object.hasOwn(BINDINGS, raw);

export type Key =
  | { readonly kind: "turn"; readonly direction: Geometry.Direction }
  | { readonly kind: "pause" }
  | { readonly kind: "other" };

export const parseKey = (raw: string): Key => {
  if (isBound(raw)) return { kind: "turn", direction: BINDINGS[raw] };
  if (raw === PAUSE) return { kind: "pause" };

  return { kind: "other" };
};

export const commandFor = <B>(state: Game.GameState<B>, key: Key): Option.Type<Game.Command> => {
  if (state.kind === "over") return Option.some({ kind: "restart" });

  switch (key.kind) {
    case "turn":
      return Option.some({ kind: "turn", direction: key.direction });
    case "pause":
      return Option.some({ kind: "togglePause" });
    case "other":
      return Option.none;
    default:
      return Assert.never(key);
  }
};
