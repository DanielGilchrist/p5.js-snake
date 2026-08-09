import type { Command, GameState } from "./game";
import type { Direction } from "./geometry";
import { assertNever, none, some, type Option } from "./result";

const BINDINGS = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  k: "up",
  j: "down",
  h: "left",
  l: "right",
} as const satisfies Record<string, Direction>;

const PAUSE = "p";

type Bound = keyof typeof BINDINGS;

const isBound = (raw: string): raw is Bound => Object.hasOwn(BINDINGS, raw);

export type Key =
  | { readonly kind: "turn"; readonly direction: Direction }
  | { readonly kind: "pause" }
  | { readonly kind: "other" };

export const parseKey = (raw: string): Key => {
  if (isBound(raw)) return { kind: "turn", direction: BINDINGS[raw] };
  if (raw === PAUSE) return { kind: "pause" };

  return { kind: "other" };
};

export const commandFor = <B>(state: GameState<B>, key: Key): Option<Command> => {
  if (state.kind === "over") return some({ kind: "restart" });

  switch (key.kind) {
    case "turn":
      return some({ kind: "turn", direction: key.direction });
    case "pause":
      return some({ kind: "togglePause" });
    case "other":
      return none;
    default:
      return assertNever(key);
  }
};
